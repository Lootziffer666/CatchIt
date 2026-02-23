package com.catchit.ui.graphics

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import com.catchit.logic.BrandBlack
import com.catchit.logic.BrandYellow
import com.catchit.logic.CatVariant
import com.catchit.logic.SceneConfig

/**
 * Zeichnet eine prozedurale Katzen-Illustration als Vollbild-Poster.
 *
 * Keine Bild-Assets noetig -- alles wird per Canvas/Path gezeichnet.
 * Die Variante (welche Katze) wird ueber SceneConfig bestimmt.
 */
@Composable
fun CatPoster(
    config: SceneConfig,
    seed: Int,
    modifier: Modifier = Modifier
) {
    Canvas(
        modifier = modifier
            .fillMaxSize()
            // KRITISCH: Offscreen-Compositing erlaubt BlendMode.Clear
            // Ohne dies gibt es schwarze Artefakte beim "Grinsen ausschneiden"
            .graphicsLayer {
                compositingStrategy = CompositingStrategy.Offscreen
            }
    ) {
        // Gesamter Hintergrund in Scene-Farbe
        drawRect(config.backgroundColor)

        // Katzenfarbe: schwarz/dunkel als Silhouette
        val catColor = BrandBlack.copy(alpha = 0.85f)
        val eyeWhite = Color.White
        val irisColor = BrandYellow

        when (config.variant) {
            CatVariant.PORTRAIT_MIN    -> drawPortraitMin(catColor, eyeWhite, irisColor)
            CatVariant.PEEK_TWO_CATS   -> drawPeekTwoCats(catColor, eyeWhite, irisColor)
            CatVariant.ANGRY_FULLBODY  -> drawAngryCat(catColor, irisColor)
            CatVariant.COMPANION_WEIRD -> drawWeirdCompanion(catColor, eyeWhite, irisColor, config.backgroundColor)
        }
    }
}

// =============================================================================
// Variante 1: Einfacher Katzenkopf (PORTRAIT_MIN)
// =============================================================================
private fun DrawScope.drawPortraitMin(cat: Color, white: Color, iris: Color) {
    val w = size.width
    val h = size.height
    val cx = w / 2f
    val cy = h * 0.6f
    val headR = w * 0.3f

    // Kopf
    drawCircle(cat, headR, Offset(cx, cy))

    // Ohren (Dreiecke)
    val earSize = headR * 0.5f
    val leftEar = Path().apply {
        moveTo(cx - headR * 0.6f, cy - headR * 0.7f)
        lineTo(cx - headR * 0.9f, cy - headR * 1.3f)
        lineTo(cx - headR * 0.2f, cy - headR * 0.85f)
        close()
    }
    val rightEar = Path().apply {
        moveTo(cx + headR * 0.6f, cy - headR * 0.7f)
        lineTo(cx + headR * 0.9f, cy - headR * 1.3f)
        lineTo(cx + headR * 0.2f, cy - headR * 0.85f)
        close()
    }
    drawPath(leftEar, cat)
    drawPath(rightEar, cat)

    // Augen
    val eyeR = headR * 0.18f
    val pupilR = headR * 0.09f
    val eyeY = cy - headR * 0.1f
    val eyeSpacing = headR * 0.45f

    drawCircle(white, eyeR, Offset(cx - eyeSpacing, eyeY))
    drawCircle(iris, pupilR, Offset(cx - eyeSpacing, eyeY))
    drawCircle(white, eyeR, Offset(cx + eyeSpacing, eyeY))
    drawCircle(iris, pupilR, Offset(cx + eyeSpacing, eyeY))

    // Nase (kleines Dreieck)
    val noseY = cy + headR * 0.15f
    val noseSize = headR * 0.08f
    val nose = Path().apply {
        moveTo(cx, noseY)
        lineTo(cx - noseSize, noseY + noseSize)
        lineTo(cx + noseSize, noseY + noseSize)
        close()
    }
    drawPath(nose, Color(0xFFFF9999))
}

// =============================================================================
// Variante 2: Zwei neugierige Katzen schauen hoch (PEEK_TWO_CATS)
// =============================================================================
private fun DrawScope.drawPeekTwoCats(cat: Color, white: Color, iris: Color) {
    val w = size.width
    val h = size.height

    // Katze 1 (links unten)
    val head1R = w * 0.18f
    val c1x = w * 0.3f
    val c1y = h - head1R * 1.2f

    // Koerper angedeutet (Halbkreis von unten)
    val body1 = Path().apply {
        moveTo(c1x - head1R * 1.5f, h)
        cubicTo(c1x - head1R * 1.2f, h - head1R * 2.5f,
                c1x + head1R * 1.2f, h - head1R * 2.5f,
                c1x + head1R * 1.5f, h)
        close()
    }
    drawPath(body1, cat)
    drawCircle(cat, head1R, Offset(c1x, c1y))

    // Ohren Katze 1
    val ear1L = Path().apply {
        moveTo(c1x - head1R * 0.55f, c1y - head1R * 0.65f)
        lineTo(c1x - head1R * 0.85f, c1y - head1R * 1.3f)
        lineTo(c1x - head1R * 0.15f, c1y - head1R * 0.8f)
        close()
    }
    val ear1R = Path().apply {
        moveTo(c1x + head1R * 0.55f, c1y - head1R * 0.65f)
        lineTo(c1x + head1R * 0.85f, c1y - head1R * 1.3f)
        lineTo(c1x + head1R * 0.15f, c1y - head1R * 0.8f)
        close()
    }
    drawPath(ear1L, cat)
    drawPath(ear1R, cat)

    // Augen Katze 1
    val eyeR = head1R * 0.2f
    val pupR = head1R * 0.1f
    drawCircle(white, eyeR, Offset(c1x - head1R * 0.35f, c1y - head1R * 0.05f))
    drawCircle(iris, pupR, Offset(c1x - head1R * 0.35f, c1y - head1R * 0.05f))
    drawCircle(white, eyeR, Offset(c1x + head1R * 0.35f, c1y + head1R * 0.05f))
    drawCircle(iris, pupR, Offset(c1x + head1R * 0.35f, c1y + head1R * 0.05f))

    // Katze 2 (rechts, etwas hoeher)
    val head2R = w * 0.16f
    val c2x = w * 0.72f
    val c2y = h - head2R * 1.6f

    val body2 = Path().apply {
        moveTo(c2x - head2R * 1.5f, h)
        cubicTo(c2x - head2R * 1.2f, h - head2R * 2.8f,
                c2x + head2R * 1.2f, h - head2R * 2.8f,
                c2x + head2R * 1.5f, h)
        close()
    }
    drawPath(body2, cat)
    drawCircle(cat, head2R, Offset(c2x, c2y))

    // Ohren Katze 2
    val ear2L = Path().apply {
        moveTo(c2x - head2R * 0.55f, c2y - head2R * 0.65f)
        lineTo(c2x - head2R * 0.8f, c2y - head2R * 1.25f)
        lineTo(c2x - head2R * 0.15f, c2y - head2R * 0.8f)
        close()
    }
    val ear2R = Path().apply {
        moveTo(c2x + head2R * 0.55f, c2y - head2R * 0.65f)
        lineTo(c2x + head2R * 0.8f, c2y - head2R * 1.25f)
        lineTo(c2x + head2R * 0.15f, c2y - head2R * 0.8f)
        close()
    }
    drawPath(ear2L, cat)
    drawPath(ear2R, cat)

    // Augen Katze 2 (groesser, neugieriger)
    val eye2R = head2R * 0.22f
    val pup2R = head2R * 0.11f
    drawCircle(white, eye2R, Offset(c2x - head2R * 0.35f, c2y - head2R * 0.05f))
    drawCircle(iris, pup2R, Offset(c2x - head2R * 0.35f, c2y - head2R * 0.05f))
    drawCircle(white, eye2R, Offset(c2x + head2R * 0.35f, c2y - head2R * 0.05f))
    drawCircle(iris, pup2R, Offset(c2x + head2R * 0.35f, c2y - head2R * 0.05f))
}

// =============================================================================
// Variante 3: Boese Katze mit Buckel (ANGRY_FULLBODY)
// =============================================================================
private fun DrawScope.drawAngryCat(cat: Color, iris: Color) {
    val w = size.width
    val h = size.height
    val cx = w / 2f
    val baseY = h * 0.85f

    // Buckel-Koerper (Silhouette)
    val body = Path().apply {
        moveTo(cx - w * 0.3f, baseY)
        // Beine links
        lineTo(cx - w * 0.28f, baseY - h * 0.05f)
        // Buckel hoch
        cubicTo(
            cx - w * 0.15f, baseY - h * 0.35f,
            cx - w * 0.05f, baseY - h * 0.42f,
            cx, baseY - h * 0.38f
        )
        // Buckel runter
        cubicTo(
            cx + w * 0.05f, baseY - h * 0.42f,
            cx + w * 0.15f, baseY - h * 0.35f,
            cx + w * 0.28f, baseY - h * 0.05f
        )
        lineTo(cx + w * 0.3f, baseY)
        close()
    }
    drawPath(body, cat)

    // Schwanz (aufgestellt, geschwungen)
    val tail = Path().apply {
        moveTo(cx + w * 0.25f, baseY - h * 0.08f)
        cubicTo(
            cx + w * 0.35f, baseY - h * 0.25f,
            cx + w * 0.4f, baseY - h * 0.4f,
            cx + w * 0.32f, baseY - h * 0.5f
        )
    }
    drawPath(tail, cat, style = androidx.compose.ui.graphics.drawscope.Stroke(width = w * 0.03f))

    // Kopf (auf dem Buckel)
    val headR = w * 0.1f
    val headCx = cx
    val headCy = baseY - h * 0.38f - headR * 0.3f
    drawCircle(cat, headR, Offset(headCx, headCy))

    // Spitze Ohren
    val earL = Path().apply {
        moveTo(headCx - headR * 0.5f, headCy - headR * 0.6f)
        lineTo(headCx - headR * 0.8f, headCy - headR * 1.5f)
        lineTo(headCx - headR * 0.1f, headCy - headR * 0.8f)
        close()
    }
    val earR = Path().apply {
        moveTo(headCx + headR * 0.5f, headCy - headR * 0.6f)
        lineTo(headCx + headR * 0.8f, headCy - headR * 1.5f)
        lineTo(headCx + headR * 0.1f, headCy - headR * 0.8f)
        close()
    }
    drawPath(earL, cat)
    drawPath(earR, cat)

    // Schlitzaugen (boese, schraeg)
    val slitW = headR * 0.5f
    val slitH = headR * 0.12f
    val eyeY = headCy - headR * 0.1f

    rotate(-12f, Offset(headCx - headR * 0.35f, eyeY)) {
        drawRect(
            iris,
            topLeft = Offset(headCx - headR * 0.35f - slitW / 2, eyeY - slitH / 2),
            size = Size(slitW, slitH)
        )
    }
    rotate(12f, Offset(headCx + headR * 0.35f, eyeY)) {
        drawRect(
            iris,
            topLeft = Offset(headCx + headR * 0.35f - slitW / 2, eyeY - slitH / 2),
            size = Size(slitW, slitH)
        )
    }
}

// =============================================================================
// Variante 4: Weird Companion (irrer Blick + Grinsen-Cutout)
// =============================================================================
private fun DrawScope.drawWeirdCompanion(cat: Color, white: Color, iris: Color, bgColor: Color) {
    val w = size.width
    val h = size.height
    val cx = w / 2f
    val cy = h * 0.55f
    val headR = w * 0.32f

    // Grosser Kopf
    drawCircle(cat, headR, Offset(cx, cy))

    // Ohren (leicht asymmetrisch fuer "weird" Effekt)
    val earL = Path().apply {
        moveTo(cx - headR * 0.55f, cy - headR * 0.7f)
        lineTo(cx - headR * 1.0f, cy - headR * 1.4f)
        lineTo(cx - headR * 0.15f, cy - headR * 0.85f)
        close()
    }
    val earR = Path().apply {
        moveTo(cx + headR * 0.6f, cy - headR * 0.65f)
        lineTo(cx + headR * 0.85f, cy - headR * 1.35f)
        lineTo(cx + headR * 0.2f, cy - headR * 0.82f)
        close()
    }
    drawPath(earL, cat)
    drawPath(earR, cat)

    // Irre grosse Augen (unterschiedlich gross!)
    val bigEyeR = headR * 0.25f
    val smallEyeR = headR * 0.18f
    val bigPupR = headR * 0.08f  // Winzige Pupillen = irrer Blick
    val smallPupR = headR * 0.06f
    val eyeY = cy - headR * 0.12f

    // Linkes Auge (gross)
    drawCircle(white, bigEyeR, Offset(cx - headR * 0.38f, eyeY))
    drawCircle(iris, bigPupR, Offset(cx - headR * 0.38f, eyeY - bigEyeR * 0.15f))

    // Rechtes Auge (kleiner, leicht versetzt)
    drawCircle(white, smallEyeR, Offset(cx + headR * 0.4f, eyeY + headR * 0.05f))
    drawCircle(iris, smallPupR, Offset(cx + headR * 0.4f, eyeY + headR * 0.05f + smallEyeR * 0.1f))

    // GRINSEN: Wird per BlendMode.Clear "ausgeschnitten"
    // Dadurch scheint der Hintergrund durch = sieht aus wie ein Loch
    val grinY = cy + headR * 0.3f
    val grinW = headR * 0.7f
    val grinH = headR * 0.2f

    // Grinsen-Bogen (ausgeschnitten aus dem Katzenkopf)
    val grin = Path().apply {
        moveTo(cx - grinW, grinY)
        cubicTo(
            cx - grinW * 0.5f, grinY + grinH * 2.5f,
            cx + grinW * 0.5f, grinY + grinH * 2.5f,
            cx + grinW, grinY
        )
        // Oberkante gerade zurueck
        lineTo(cx + grinW, grinY)
        cubicTo(
            cx + grinW * 0.4f, grinY + grinH * 0.5f,
            cx - grinW * 0.4f, grinY + grinH * 0.5f,
            cx - grinW, grinY
        )
        close()
    }

    // BlendMode.Clear schneidet das Grinsen aus dem Katzenkopf
    // Offscreen-Compositing (gesetzt am Canvas) sorgt dafuer, dass das funktioniert
    drawPath(grin, bgColor, blendMode = BlendMode.Clear)

    // Alternativ: Zaehne andeuten (kleine weisse Dreiecke im Grinsen)
    val toothW = headR * 0.06f
    val toothH = headR * 0.08f
    for (i in -2..2) {
        val tx = cx + i * toothW * 2.5f
        val tooth = Path().apply {
            moveTo(tx - toothW, grinY + grinH * 0.4f)
            lineTo(tx, grinY + grinH * 0.4f + toothH)
            lineTo(tx + toothW, grinY + grinH * 0.4f)
            close()
        }
        drawPath(tooth, white)
    }
}
