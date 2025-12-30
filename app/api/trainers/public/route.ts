/**
 * GET /api/trainers/public
 * 
 * Dohvaća listu javno dostupnih trenera s njihovim portfolio podacima.
 * Koristi se za pregledavanje trenera prije povezivanja.
 * 
 * Query params:
 * - specialization: filter po specijalizaciji
 * - location: filter po lokaciji
 * - training_type: 'online' | 'in_person' | 'both'
 * - min_rating: minimalna prosječna ocjena
 * - limit: broj rezultata (default 20)
 * - offset: offset za paginaciju
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const supabase = createServiceClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const specialization = searchParams.get('specialization');
    const location = searchParams.get('location');
    const trainingType = searchParams.get('training_type');
    const minRating = searchParams.get('min_rating');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Dohvati trenere s osnovnim podacima
    let query = supabase
      .from('trainers')
      .select(`
        id,
        name,
        avatar_url,
        bio,
        motto,
        specializations,
        years_of_experience,
        location,
        hourly_rate,
        currency,
        training_type,
        is_verified,
        trainer_code
      `)
      .eq('is_public', true)
      .order('is_verified', { ascending: false })
      .order('years_of_experience', { ascending: false })
      .range(offset, offset + limit - 1);

    // Primijeni filtere
    if (specialization) {
      query = query.contains('specializations', [specialization]);
    }
    
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }
    
    if (trainingType && ['online', 'in_person', 'both'].includes(trainingType)) {
      query = query.or(`training_type.eq.${trainingType},training_type.eq.both`);
    }

    const { data: trainers, error } = await query;

    if (error) {
      console.error('[trainers/public] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Dohvati statistiku za svakog trenera (broj klijenata i prosječna ocjena)
    const trainersWithStats = await Promise.all(
      (trainers || []).map(async (trainer) => {
        // Broj klijenata
        const { count: clientCount } = await supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('connected_trainer_id', trainer.id);

        // Prosječna ocjena i broj recenzija
        const { data: reviewStats } = await supabase
          .from('trainer_reviews')
          .select('rating')
          .eq('trainer_id', trainer.id)
          .eq('is_public', true);

        const reviews = reviewStats || [];
        const averageRating = reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0;

        return {
          ...trainer,
          clientCount: clientCount || 0,
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: reviews.length,
        };
      })
    );

    // Filtriraj po minimalnoj ocjeni ako je zadano
    let filteredTrainers = trainersWithStats;
    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      filteredTrainers = trainersWithStats.filter(t => t.averageRating >= minRatingNum);
    }

    // Dohvati ukupni broj za paginaciju
    const { count: totalCount } = await supabase
      .from('trainers')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true);

    return NextResponse.json({
      success: true,
      data: {
        trainers: filteredTrainers,
        pagination: {
          total: totalCount || 0,
          limit,
          offset,
          hasMore: offset + limit < (totalCount || 0),
        },
      },
    });
  } catch (error) {
    console.error('[trainers/public] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

