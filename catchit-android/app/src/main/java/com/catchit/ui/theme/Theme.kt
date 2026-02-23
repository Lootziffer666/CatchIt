package com.catchit.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.isSystemInDarkTheme
import com.catchit.logic.BrandBlack
import com.catchit.logic.BrandOffWhite
import com.catchit.logic.BrandOrange
import com.catchit.logic.BrandRed
import com.catchit.logic.BrandYellow

private val LightColors = lightColorScheme(
    primary = BrandOrange,
    onPrimary = BrandOffWhite,
    secondary = BrandYellow,
    onSecondary = BrandBlack,
    error = BrandRed,
    background = BrandOffWhite,
    onBackground = BrandBlack,
    surface = BrandOffWhite,
    onSurface = BrandBlack
)

private val DarkColors = darkColorScheme(
    primary = BrandOrange,
    onPrimary = BrandBlack,
    secondary = BrandYellow,
    onSecondary = BrandBlack,
    error = BrandRed,
    background = BrandBlack,
    onBackground = BrandOffWhite,
    surface = BrandBlack,
    onSurface = BrandOffWhite
)

@Composable
fun CatchItTheme(content: @Composable () -> Unit) {
    val colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
