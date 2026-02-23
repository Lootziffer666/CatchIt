package com.catchit.logic

import androidx.compose.ui.graphics.Color
import com.catchit.util.relativeLuminance

enum class FlowPhase {
    ASKING,
    IDLE,
    TRACKING,
    ALERTING
}

enum class AlertLevel {
    CALM,
    READY,
    WARNING,
    ALERT
}

enum class CatVariant {
    PORTRAIT_MIN,
    PEEK_TWO_CATS,
    ANGRY_FULLBODY,
    COMPANION_WEIRD
}

data class SceneConfig(
    val backgroundColor: Color,
    val contentColor: Color,
    val useDarkSystemBarIcons: Boolean,
    val variant: CatVariant,
    val headline: String,
    val subline: String
)

val BrandBlack = Color(0xFF0B0B0D)
val BrandOffWhite = Color(0xFFF7F2E8)
val BrandOrange = Color(0xFFFF7A00)
val BrandRed = Color(0xFFD60000)
val BrandYellow = Color(0xFFF9C80E)

fun mapStateToScene(phase: FlowPhase, alertLevel: AlertLevel, seed: Int): SceneConfig {
    val weirdAllowed = phase == FlowPhase.ASKING && alertLevel != AlertLevel.ALERT
    val weirdRoll = ((seed * 1_103_515_245L + 12_345L) ushr 16).toInt() and 0x7FFF
    val isWeird = weirdAllowed && (weirdRoll % 100) < 8

    val bg = when (alertLevel) {
        AlertLevel.CALM -> BrandOffWhite
        AlertLevel.READY -> BrandYellow
        AlertLevel.WARNING -> BrandOrange
        AlertLevel.ALERT -> BrandRed
    }

    val useDarkIcons = bg.relativeLuminance() > 0.5f
    val onBg = if (useDarkIcons) BrandBlack else BrandOffWhite

    val variant = when {
        alertLevel == AlertLevel.ALERT -> CatVariant.ANGRY_FULLBODY
        isWeird -> CatVariant.COMPANION_WEIRD
        phase == FlowPhase.ASKING -> CatVariant.PEEK_TWO_CATS
        else -> CatVariant.PORTRAIT_MIN
    }

    val headline = when (alertLevel) {
        AlertLevel.CALM -> "Alles ruhig"
        AlertLevel.READY -> "Bald aufbrechen"
        AlertLevel.WARNING -> "Es wird knapp"
        AlertLevel.ALERT -> "Jetzt los"
    }

    val subline = when (phase) {
        FlowPhase.ASKING -> "Stelle dein Ziel und die Zeit ein"
        FlowPhase.IDLE -> "Noch keine aktive Verfolgung"
        FlowPhase.TRACKING -> "Tracking laeuft"
        FlowPhase.ALERTING -> "Sofort handeln"
    }

    return SceneConfig(
        backgroundColor = bg,
        contentColor = onBg,
        useDarkSystemBarIcons = useDarkIcons,
        variant = variant,
        headline = headline,
        subline = subline
    )
}

fun companionIsAllowed(phase: FlowPhase, alertLevel: AlertLevel): Boolean {
    return phase == FlowPhase.ASKING && alertLevel != AlertLevel.ALERT
}
