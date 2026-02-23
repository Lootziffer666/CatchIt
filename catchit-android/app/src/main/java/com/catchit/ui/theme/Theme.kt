package com.catchit.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * CatchIt nutzt ein eigenes Farbsystem (SceneLogic steuert alles).
 * Dieses Theme setzt nur Standard-Defaults fuer Material3-Components
 * wie Buttons, Chips, etc.
 */
@Composable
fun CatchItTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFFFF7A00),     // CatchIt Orange
            onPrimary = Color.White,
            secondary = Color(0xFF0B0B0D),   // CatchIt Schwarz
            onSecondary = Color.White,
            surface = Color(0xFFF7F2E8),     // Off-White
            onSurface = Color(0xFF0B0B0D),
        ),
        content = content
    )
}
