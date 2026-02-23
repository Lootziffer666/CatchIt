package com.catchit.logic

import androidx.compose.ui.graphics.Color

// --- Flow: Wo im Ablauf ist der Nutzer? ---
enum class FlowPhase {
    ASKING,    // Fragen werden gestellt (Start)
    IDLE,      // Alles geplant, noch Zeit
    TRACKING,  // Aktiv unterwegs / kurz vor Abfahrt
    ALERTING   // Kritisch! Jetzt handeln!
}

// --- Dringlichkeit: Wie ernst ist die Lage? ---
enum class AlertLevel {
    CALM,      // Alles gut (heller Hintergrund)
    READY,     // Bald geht's los (Orange)
    WARNING,   // Aufpassen (Dunkel-Orange)
    ALERT      // Sofort handeln! (Rot)
}

// --- Katzen-Varianten fuer die Poster-Grafik ---
enum class CatVariant {
    PORTRAIT_MIN,      // Einfacher Kopf + Augen
    PEEK_TWO_CATS,     // Zwei Katzen schauen neugierig
    ANGRY_FULLBODY,    // Boese Katze bei Alert
    COMPANION_WEIRD    // Irrer Blick + Grinsen (selten, persoenlich)
}

// --- Das komplette visuelle "Rezept" fuer einen Screen ---
data class SceneConfig(
    val backgroundColor: Color,
    val contentColor: Color,         // Text/Icons (Kontrast zum Hintergrund)
    val useLightSystemBars: Boolean, // true = dunkle Icons in Statusbar (fuer helle BGs)
    val variant: CatVariant,
    val headline: String
)

// --- Brand-Farben ---
val BrandBlack  = Color(0xFF0B0B0D)
val BrandWhite  = Color(0xFFF7F2E8)
val BrandOrange = Color(0xFFFF7A00)
val BrandRed    = Color(0xFFD60000)
val BrandYellow = Color(0xFFF5C518) // Iris-Farbe

/**
 * Pure Function: Gleiche Eingabe = Gleiches Ergebnis. Immer.
 *
 * Bestimmt anhand von Phase, Dringlichkeit und einem Seed
 * das komplette Aussehen des Screens.
 */
fun mapStateToScene(phase: FlowPhase, alertLevel: AlertLevel, seed: Int): SceneConfig {

    // 1. "Weird Companion" Regel:
    //    - Nur wenn der Nutzer gerade Fragen beantwortet (ASKING)
    //    - NIEMALS bei ALERT (da muss es ernst bleiben)
    //    - 8% Chance, deterministisch per Seed
    val isWeird = if (phase == FlowPhase.ASKING && alertLevel != AlertLevel.ALERT) {
        val hash = ((seed.toLong() * 1103515245L + 12345L) ushr 16).toInt() and 0x7FFF
        (hash % 100) < 8
    } else {
        false
    }

    // 2. Hintergrund nach Dringlichkeit
    val bg = when (alertLevel) {
        AlertLevel.CALM    -> BrandWhite              // Hell, entspannt
        AlertLevel.READY   -> BrandOrange             // Orange, aufmerksam
        AlertLevel.WARNING -> Color(0xFFFF4D00)       // Dunkel-Orange, dringend
        AlertLevel.ALERT   -> BrandRed                // Rot, sofort handeln
    }

    // 3. Textfarbe: Hell auf dunkel, Dunkel auf hell
    //    Berechnet ueber Luminanz des Hintergrunds
    val bgLuminance = bg.red * 0.299f + bg.green * 0.587f + bg.blue * 0.114f
    val onBg = if (bgLuminance > 0.5f) BrandBlack else BrandWhite

    // 4. System-Bar: Dunkle Icons nur auf hellem Hintergrund
    //    (useLightSystemBars=true bedeutet: dunkle Icons = fuer helle Screens)
    val lightBars = bgLuminance > 0.5f

    // 5. Welche Katze zeigen wir?
    val variant = when {
        alertLevel == AlertLevel.ALERT -> CatVariant.ANGRY_FULLBODY
        isWeird                        -> CatVariant.COMPANION_WEIRD
        phase == FlowPhase.ASKING      -> CatVariant.PEEK_TWO_CATS
        else                           -> CatVariant.PORTRAIT_MIN
    }

    // 6. Headline
    val headline = when (phase) {
        FlowPhase.ASKING   -> "Wohin musst du?"
        FlowPhase.IDLE     -> "Alles ruhig."
        FlowPhase.TRACKING -> "Abfahrten geladen"
        FlowPhase.ALERTING -> "JETZT LOS"
    }

    return SceneConfig(bg, onBg, lightBars, variant, headline)
}

/**
 * Gibt an, ob der Weird Companion in einem gegebenen Zustand erscheinen darf.
 * Bedingungen: Phase == ASKING und AlertLevel != ALERT.
 */
fun companionIsAllowed(phase: FlowPhase, alertLevel: AlertLevel): Boolean {
    return phase == FlowPhase.ASKING && alertLevel != AlertLevel.ALERT
}

/**
 * Berechnet die Dringlichkeit anhand der Minuten bis zur naechsten Abfahrt.
 *
 * > 15 min  → CALM    (alles gut, kein Stress)
 * 8-15 min  → READY   (bald geht's los)
 * 3-8 min   → WARNING (aufpassen, losgehen)
 * < 3 min   → ALERT   (JETZT oder verpasst)
 */
fun alertFromMinutes(minutes: Long): AlertLevel {
    return when {
        minutes > 15 -> AlertLevel.CALM
        minutes > 8  -> AlertLevel.READY
        minutes > 3  -> AlertLevel.WARNING
        else         -> AlertLevel.ALERT
    }
}
