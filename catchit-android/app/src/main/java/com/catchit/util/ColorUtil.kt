package com.catchit.util

import androidx.compose.ui.graphics.Color
import kotlin.math.pow

/**
 * Relative luminance in [0..1]. Avoids relying on Color.luminance() extension availability.
 */
fun Color.relativeLuminance(): Float {
    fun channel(c: Float): Float =
        if (c <= 0.03928f) c / 12.92f else ((c + 0.055f) / 1.055f).pow(2.4f)

    val r = channel(red)
    val g = channel(green)
    val b = channel(blue)
    return (0.2126f * r + 0.7152f * g + 0.0722f * b)
	}