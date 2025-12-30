/**
 * GET /api/trainers/[trainerId]/profile
 * 
 * Dohvaća detaljan javni profil trenera uključujući:
 * - Osnovne podatke
 * - Certifikate
 * - Recenzije
 * - Galeriju slika
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const supabase = createServiceClient();

interface RouteParams {
  params: Promise<{
    trainerId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { trainerId } = await params;

    if (!trainerId) {
      return NextResponse.json(
        { success: false, error: 'Trainer ID je obavezan', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // Dohvati osnovne podatke trenera
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select(`
        id,
        name,
        email,
        avatar_url,
        cover_image_url,
        bio,
        motto,
        specializations,
        certifications,
        years_of_experience,
        location,
        hourly_rate,
        currency,
        languages,
        availability,
        training_type,
        social_links,
        is_verified,
        is_public,
        trainer_code,
        created_at
      `)
      .eq('id', trainerId)
      .single();

    if (trainerError) {
      if (trainerError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Trener nije pronađen', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      console.error('[trainers/profile] Error:', trainerError);
      return NextResponse.json(
        { success: false, error: trainerError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Provjeri je li profil javan
    if (!trainer.is_public) {
      return NextResponse.json(
        { success: false, error: 'Ovaj profil nije javan', code: 'PROFILE_PRIVATE' },
        { status: 403 }
      );
    }

    // Dohvati recenzije
    const { data: reviews } = await supabase
      .from('trainer_reviews')
      .select(`
        id,
        client_name,
        rating,
        review_text,
        is_verified,
        created_at
      `)
      .eq('trainer_id', trainerId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20);

    // Dohvati galeriju
    const { data: gallery } = await supabase
      .from('trainer_gallery')
      .select(`
        id,
        image_url,
        caption,
        image_type
      `)
      .eq('trainer_id', trainerId)
      .order('sort_order', { ascending: true })
      .limit(30);

    // Izračunaj statistiku
    const { count: clientCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('connected_trainer_id', trainerId);

    const reviewsList = reviews || [];
    const averageRating = reviewsList.length > 0
      ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
      : 0;

    // Formatiraj odgovor
    const profile = {
      id: trainer.id,
      name: trainer.name,
      avatarUrl: trainer.avatar_url,
      coverImageUrl: trainer.cover_image_url,
      bio: trainer.bio,
      motto: trainer.motto,
      specializations: trainer.specializations || [],
      certifications: trainer.certifications || [],
      yearsOfExperience: trainer.years_of_experience || 0,
      location: trainer.location,
      hourlyRate: trainer.hourly_rate,
      currency: trainer.currency || 'EUR',
      languages: trainer.languages || ['Hrvatski'],
      availability: trainer.availability,
      trainingType: trainer.training_type || 'both',
      socialLinks: trainer.social_links || {},
      isVerified: trainer.is_verified,
      trainerCode: trainer.trainer_code,
      memberSince: trainer.created_at,
      stats: {
        clientCount: clientCount || 0,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: reviewsList.length,
      },
      reviews: reviewsList.map(r => ({
        id: r.id,
        clientName: r.client_name,
        rating: r.rating,
        text: r.review_text,
        isVerified: r.is_verified,
        createdAt: r.created_at,
      })),
      gallery: (gallery || []).map(g => ({
        id: g.id,
        imageUrl: g.image_url,
        caption: g.caption,
        type: g.image_type,
      })),
    };

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('[trainers/profile] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

