package com.catchit.ui.graphics

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import com.catchit.logic.BrandBlack
import com.catchit.logic.CatVariant
import com.catchit.logic.SceneConfig

@Composable
fun CatPoster(config: SceneConfig, modifier: Modifier = Modifier) {
    Canvas(
        modifier = modifier
            .fillMaxSize()
            .graphicsLayer {
                compositingStrategy = CompositingStrategy.Offscreen
            }
    ) {
        drawRect(config.backgroundColor)
        when (config.variant) {
            CatVariant.PORTRAIT_MIN -> drawPortraitMin(size.width, size.height)
            CatVariant.PEEK_TWO_CATS -> drawPeekTwoCats(size.width, size.height)
            CatVariant.ANGRY_FULLBODY -> drawAngryFullBody(size.width, size.height)
            CatVariant.COMPANION_WEIRD -> drawCompanionWeird(size.width, size.height)
        }
    }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawPortraitMin(w: Float, h: Float) {
    drawOval(
        color = BrandBlack,
        topLeft = Offset(w * 0.2f, h * 0.18f),
        size = Size(w * 0.6f, h * 0.72f)
    )
    drawCircle(BrandBlack, radius = w * 0.1f, center = Offset(w * 0.32f, h * 0.2f))
    drawCircle(BrandBlack, radius = w * 0.1f, center = Offset(w * 0.68f, h * 0.2f))
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawPeekTwoCats(w: Float, h: Float) {
    val left = Path().apply {
        moveTo(w * 0.0f, h * 0.55f)
        cubicTo(w * 0.05f, h * 0.25f, w * 0.28f, h * 0.25f, w * 0.32f, h * 0.55f)
        lineTo(w * 0.32f, h)
        lineTo(w * 0f, h)
        close()
    }
    val right = Path().apply {
        moveTo(w * 1.0f, h * 0.6f)
        cubicTo(w * 0.95f, h * 0.28f, w * 0.72f, h * 0.28f, w * 0.68f, h * 0.6f)
        lineTo(w * 0.68f, h)
        lineTo(w, h)
        close()
    }
    drawPath(left, BrandBlack)
    drawPath(right, BrandBlack)
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawAngryFullBody(w: Float, h: Float) {
    val arched = Path().apply {
        moveTo(w * 0.1f, h * 0.8f)
        cubicTo(w * 0.2f, h * 0.35f, w * 0.8f, h * 0.35f, w * 0.9f, h * 0.8f)
        lineTo(w * 0.76f, h * 0.82f)
        lineTo(w * 0.68f, h * 0.95f)
        lineTo(w * 0.3f, h * 0.95f)
        lineTo(w * 0.2f, h * 0.82f)
        close()
    }
    drawPath(arched, BrandBlack)
    drawLine(BrandBlack, Offset(w * 0.15f, h * 0.58f), Offset(w * 0.34f, h * 0.53f), strokeWidth = w * 0.01f)
    drawLine(BrandBlack, Offset(w * 0.85f, h * 0.58f), Offset(w * 0.66f, h * 0.53f), strokeWidth = w * 0.01f)
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawCompanionWeird(w: Float, h: Float) {
    drawOval(
        color = BrandBlack,
        topLeft = Offset(w * 0.14f, h * 0.15f),
        size = Size(w * 0.72f, h * 0.72f)
    )
    drawCircle(color = BrandBlack, radius = w * 0.11f, center = Offset(w * 0.28f, h * 0.2f))
    drawCircle(color = BrandBlack, radius = w * 0.11f, center = Offset(w * 0.72f, h * 0.2f))

    drawCircle(color = androidx.compose.ui.graphics.Color.White, radius = w * 0.03f, center = Offset(w * 0.38f, h * 0.45f), style = Fill)
    drawCircle(color = androidx.compose.ui.graphics.Color.White, radius = w * 0.03f, center = Offset(w * 0.62f, h * 0.45f), style = Fill)

    val grinArea = Rect(left = w * 0.22f, top = h * 0.54f, right = w * 0.78f, bottom = h * 0.73f)
    drawArc(
        color = androidx.compose.ui.graphics.Color.Transparent,
        startAngle = 0f,
        sweepAngle = 180f,
        useCenter = false,
        topLeft = Offset(grinArea.left, grinArea.top),
        size = Size(grinArea.width, grinArea.height),
        style = Stroke(width = w * 0.06f),
        blendMode = BlendMode.Clear
    )

    val teethWidth = w * 0.56f
    val teethHeight = h * 0.035f
    val startX = w * 0.22f
    val teethY = h * 0.64f
    drawRect(
        color = androidx.compose.ui.graphics.Color.White,
        topLeft = Offset(startX, teethY),
        size = Size(teethWidth, teethHeight)
    )
    for (i in 1..8) {
        val x = startX + (teethWidth / 9f) * i
        drawLine(
            color = BrandBlack,
            start = Offset(x, teethY),
            end = Offset(x, teethY + teethHeight),
            strokeWidth = w * 0.003f
        )
    }
}
