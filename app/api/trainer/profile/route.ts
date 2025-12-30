/**
 * GET/PUT /api/trainer/profile
 * 
 * Dohvaća ili ažurira profil trenera (portfolio).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

const supabase = createServiceClient();

/**
 * GET /api/trainer/profile
 * Dohvaća profil trenutno prijavljenog trenera
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const trainerId = auth.userId;

    const { data: trainer, error } = await supabase
      .from('trainers')
      .select(`
        id,
        name,
        email,
        bio,
        motto,
        avatar_url,
        cover_image_url,
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
        is_public,
        is_verified,
        trainer_code,
        created_at
      `)
      .eq('id', trainerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Trener ne postoji, vrati prazni profil
        return NextResponse.json({
          success: true,
          data: null,
          message: 'Profil još nije kreiran',
        });
      }
      console.error('[trainer/profile] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trainer,
    });
  } catch (error) {
    console.error('[trainer/profile] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trainer/profile
 * Ažurira profil trenera
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const trainerId = auth.userId;
    const body = await request.json();

    // Validiraj obavezna polja
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Ime je obavezno', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Pripremi podatke za ažuriranje
    const updateData: Record<string, any> = {
      name: body.name.trim(),
      updated_at: new Date().toISOString(),
    };

    // Opcionalna polja
    if (body.bio !== undefined) updateData.bio = body.bio?.trim() || null;
    if (body.motto !== undefined) updateData.motto = body.motto?.trim() || null;
    if (body.specializations !== undefined) updateData.specializations = body.specializations || [];
    if (body.certifications !== undefined) updateData.certifications = body.certifications || [];
    if (body.years_of_experience !== undefined) updateData.years_of_experience = body.years_of_experience || 0;
    if (body.location !== undefined) updateData.location = body.location?.trim() || null;
    if (body.hourly_rate !== undefined) updateData.hourly_rate = body.hourly_rate;
    if (body.currency !== undefined) updateData.currency = body.currency || 'EUR';
    if (body.languages !== undefined) updateData.languages = body.languages || ['Hrvatski'];
    if (body.availability !== undefined) updateData.availability = body.availability;
    if (body.training_type !== undefined) {
      if (['online', 'in_person', 'both'].includes(body.training_type)) {
        updateData.training_type = body.training_type;
      }
    }
    if (body.social_links !== undefined) updateData.social_links = body.social_links || {};
    if (body.is_public !== undefined) updateData.is_public = body.is_public;
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
    if (body.cover_image_url !== undefined) updateData.cover_image_url = body.cover_image_url;

    // Ažuriraj profil
    const { data: updatedTrainer, error } = await supabase
      .from('trainers')
      .update(updateData)
      .eq('id', trainerId)
      .select()
      .single();

    if (error) {
      console.error('[trainer/profile] Update error:', error);
      return NextResponse.json(
        { success: false, error: error.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTrainer,
      message: 'Profil uspješno ažuriran',
    });
  } catch (error) {
    console.error('[trainer/profile] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

