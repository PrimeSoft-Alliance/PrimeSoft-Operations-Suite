import { Settings, Booking, Lead, Contact, OnboardingRequest } from '../models';
import { startOfDay, endOfDay, format } from 'date-fns';

/**
 * AI Data Loaders
 * 
 * These functions ensure the AI never hallucination data from the database.
 * Every piece of information must come from verified database queries.
 * All queries include clientId filtering for strict tenant isolation.
 */

/**
 * Load client business settings and verify they exist
 */
export async function loadClientSettings(clientId: string) {
  if (!clientId) {
    return { error: 'ClientId is required' };
  }

  try {
    const settings = await Settings.findOne({ clientId });
    
    if (!settings) {
      return {
        error: `No settings found for client: ${clientId}`
      };
    }

    return {
      businessName: settings.businessName || 'Business',
      contactEmail: settings.contactEmail || '',
      contactPhone: settings.contactPhone || '',
      aboutText: settings.aboutText || '',
      services: (settings.services || []).map((s: any) => ({
        name: s.name,
        description: s.description,
        price: s.price,
        durationMinutes: s.durationMinutes
      })),
      faqs: (settings.faqs || []).map((f: any) => ({
        question: f.question,
        answer: f.answer
      })),
      workingHours: settings.workingHours || [],
      timezone: settings.timezone || 'America/New_York',
      aiBehaviorInstructions: settings.aiBehaviorInstructions || ''
    };
  } catch (err) {
    console.error('[DATA-LOADER] Error loading client settings:', err);
    return { error: 'Failed to load settings' };
  }
}

/**
 * Check availability for a specific date and optional service
 * This MUST be called by AI before suggesting any slots
 */
export async function checkAvailabilityForAI(
  clientId: string,
  dateStr: string,
  serviceName?: string
): Promise<any> {
  if (!clientId) {
    return { error: 'ClientId is required', availableSlots: [] };
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { error: 'Invalid date format. Use YYYY-MM-DD', availableSlots: [] };
    }

    // Fetch settings
    const settings = await Settings.findOne({ clientId });
    if (!settings) {
      return { error: 'Client settings not found', availableSlots: [] };
    }

    // Check if that day is open
    const dayOfWeek = date.getDay();
    const workingHour = settings.workingHours?.find((wh: any) => wh.day === dayOfWeek);

    if (!workingHour || !workingHour.isOpen) {
      return {
        message: `${format(date, 'EEEE, MMM d')} is not a business day`,
        availableSlots: []
      };
    }

    // Parse working hours
    const openParts = (workingHour.openTime || '08:00').split(':').map(Number);
    const closeParts = (workingHour.closeTime || '17:00').split(':').map(Number);

    if (openParts.length < 2 || closeParts.length < 2) {
      return { error: 'Invalid working hours configured', availableSlots: [] };
    }

    let currentSlot = new Date(date);
    currentSlot.setHours(openParts[0], openParts[1], 0, 0);

    const endTime = new Date(date);
    endTime.setHours(closeParts[0], closeParts[1], 0, 0);

    const slotDuration = settings.slotDurationMinutes || 60;
    const buffer = settings.bufferTimeMinutes || 30;

    // Fetch ONLY this client's bookings for this date
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const existingBookings = await Booking.find({
      clientId,
      preferredDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed'] }
    }).select('preferredStartTime preferredEndTime');

    const availableSlots = [];
    let iterations = 0;

    while (currentSlot < endTime && iterations < 100) {
      iterations++;
      const slotEnd = new Date(currentSlot);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

      if (slotEnd > endTime) break;

      const slotStartStr = format(currentSlot, 'HH:mm');
      const slotEndStr = format(slotEnd, 'HH:mm');

      // Check for overlaps with existing bookings (STRICT isolation to this clientId)
      const hasOverlap = existingBookings.some(b => {
        const bStart = b.preferredStartTime;
        const bEnd = b.preferredEndTime;
        
        if (!bStart || !bEnd) return false;
        
        return (slotStartStr >= bStart && slotStartStr < bEnd) ||
               (slotEndStr > bStart && slotEndStr <= bEnd) ||
               (slotStartStr <= bStart && slotEndStr >= bEnd);
      });

      if (!hasOverlap) {
        const startTime12 = format(currentSlot, 'hh:mm a');
        const endTime12 = format(slotEnd, 'hh:mm a');
        availableSlots.push({
          startTime: slotStartStr,
          endTime: slotEndStr,
          displayTime: `${startTime12} - ${endTime12}`
        });
      }

      currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration + buffer);
    }

    return {
      date: format(date, 'EEEE, MMM d, yyyy'),
      availableSlots,
      timezone: settings.timezone
    };
  } catch (err) {
    console.error('[DATA-LOADER] Error checking availability:', err);
    return { error: 'Failed to check availability', availableSlots: [] };
  }
}

/**
 * Load service information by name (verified against database)
 */
export async function loadServiceByName(
  clientId: string,
  serviceName: string
): Promise<any> {
  if (!clientId || !serviceName) {
    return { error: 'ClientId and service name are required' };
  }

  try {
    const settings = await Settings.findOne({ clientId });
    if (!settings) {
      return { error: 'Client settings not found' };
    }

    const service = settings.services?.find(
      (s: any) => s.name?.toLowerCase() === serviceName.toLowerCase()
    );

    if (!service) {
      return {
        error: `Service "${serviceName}" not found`,
        availableServices: settings.services?.map((s: any) => s.name) || []
      };
    }

    return {
      name: service.name,
      description: service.description,
      price: service.price,
      durationMinutes: service.durationMinutes
    };
  } catch (err) {
    console.error('[DATA-LOADER] Error loading service:', err);
    return { error: 'Failed to load service' };
  }
}

/**
 * Search for existing bookings by customer email (STRICT clientId isolation)
 */
export async function searchBookingsByEmail(
  clientId: string,
  email: string
): Promise<any> {
  if (!clientId || !email) {
    return { error: 'ClientId and email are required', bookings: [] };
  }

  try {
    const bookings = await Booking.find({
      clientId,
      email: email.toLowerCase()
    })
      .select('preferredDate preferredStartTime preferredEndTime serviceSelection status')
      .sort({ preferredDate: -1 })
      .limit(5);

    return {
      found: bookings.length,
      bookings: bookings.map(b => ({
        date: format(new Date(b.preferredDate), 'MMM d, yyyy'),
        time: `${b.preferredStartTime} - ${b.preferredEndTime}`,
        service: b.serviceSelection,
        status: b.status
      }))
    };
  } catch (err) {
    console.error('[DATA-LOADER] Error searching bookings:', err);
    return { error: 'Failed to search bookings', bookings: [] };
  }
}

/**
 * Check onboarding request status (for platform clients)
 */
export async function checkOnboardingStatus(
  clientId: string,
  email: string
): Promise<any> {
  if (!clientId || !email) {
    return { error: 'ClientId and email are required' };
  }

  try {
    // Only platform-prime can check onboarding
    if (clientId !== 'platform-prime') {
      return { error: 'Not authorized to check onboarding status' };
    }

    const request = await OnboardingRequest.findOne({
      email: email.toLowerCase()
    }).select('requestId status businessName createdAt');

    if (!request) {
      return { status: 'not_found', message: 'No application found for this email' };
    }

    return {
      status: request.status,
      businessName: request.businessName,
      appliedOn: format(new Date(request.createdAt), 'MMM d, yyyy'),
      requestId: request.requestId
    };
  } catch (err) {
    console.error('[DATA-LOADER] Error checking onboarding status:', err);
    return { error: 'Failed to check status' };
  }
}

/**
 * Log AI interaction for debugging and auditing
 */
export async function logAIInteraction(
  clientId: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  if (!clientId) {
    console.warn('[DATA-LOADER] Cannot log: missing clientId');
    return;
  }

  try {
    const { AILog } = await import('../models');
    await AILog.create({
      clientId,
      sessionId,
      role,
      content
    });
  } catch (err) {
    console.error('[DATA-LOADER] Error logging AI interaction:', err);
  }
}
