package com.catchit.logic

import org.junit.Test
import org.junit.Assert.*

class SceneMappingTest {

    /**
     * Gleiche Eingabe muss IMMER gleiches Ergebnis liefern.
     */
    @Test
    fun `same inputs always produce same output`() {
        val config1 = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, 42)
        val config2 = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, 42)
        assertEquals(config1, config2)
    }

    /**
     * Weird Companion erscheint deterministisch fuer bestimmte Seeds.
     * Test ist bounded: max 10.000 Versuche, dann Abbruch.
     */
    @Test
    fun `weird companion appears deterministically`() {
        var weirdSeed = -1

        for (seed in 0 until 10_000) {
            val config = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, seed)
            if (config.variant == CatVariant.COMPANION_WEIRD) {
                weirdSeed = seed
                break
            }
        }

        // Es MUSS mindestens einen Seed geben (8% Chance)
        assertTrue(
            "Kein Weird-Seed in 10.000 Versuchen gefunden (statistisch unwahrscheinlich)",
            weirdSeed >= 0
        )

        // Gleicher Seed = gleiches Ergebnis
        val config2 = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, weirdSeed)
        assertEquals(CatVariant.COMPANION_WEIRD, config2.variant)
    }

    /**
     * Weird Companion darf NIEMALS bei ALERT erscheinen,
     * selbst wenn der Seed normalerweise "weird" waere.
     */
    @Test
    fun `weird companion NEVER appears in ALERT`() {
        // Finde zuerst einen Weird-Seed
        var weirdSeed = -1
        for (seed in 0 until 10_000) {
            val config = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, seed)
            if (config.variant == CatVariant.COMPANION_WEIRD) {
                weirdSeed = seed
                break
            }
        }
        assertTrue("Brauche Weird-Seed fuer diesen Test", weirdSeed >= 0)

        // Mit ALERT muss ANGRY_FULLBODY kommen, nie WEIRD
        val alertConfig = mapStateToScene(FlowPhase.ASKING, AlertLevel.ALERT, weirdSeed)
        assertNotEquals(CatVariant.COMPANION_WEIRD, alertConfig.variant)
        assertEquals(CatVariant.ANGRY_FULLBODY, alertConfig.variant)
    }

    /**
     * ALERT erzwingt immer ANGRY_FULLBODY, egal welche Phase.
     */
    @Test
    fun `ALERT always forces ANGRY_FULLBODY`() {
        for (phase in FlowPhase.entries) {
            for (seed in listOf(0, 1, 42, 100, 999, 5000)) {
                val config = mapStateToScene(phase, AlertLevel.ALERT, seed)
                assertEquals(
                    "Phase=$phase, Seed=$seed sollte ANGRY_FULLBODY sein",
                    CatVariant.ANGRY_FULLBODY,
                    config.variant
                )
            }
        }
    }

    /**
     * Helle Hintergruende bekommen dunklen Text, dunkle bekommen hellen.
     */
    @Test
    fun `content color contrasts with background`() {
        // CALM = heller Hintergrund -> dunkler Text
        val calm = mapStateToScene(FlowPhase.IDLE, AlertLevel.CALM, 0)
        assertEquals(BrandBlack, calm.contentColor)
        assertTrue("CALM sollte light system bars haben", calm.useLightSystemBars)

        // ALERT = dunkler/roter Hintergrund -> heller Text
        val alert = mapStateToScene(FlowPhase.ALERTING, AlertLevel.ALERT, 0)
        assertEquals(BrandWhite, alert.contentColor)
        assertFalse("ALERT sollte KEINE light system bars haben", alert.useLightSystemBars)
    }

    /**
     * ASKING + CALM ohne Weird -> PEEK_TWO_CATS
     */
    @Test
    fun `ASKING without weird shows PEEK_TWO_CATS`() {
        // Finde einen Non-Weird Seed
        var normalSeed = -1
        for (seed in 0 until 10_000) {
            val config = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, seed)
            if (config.variant == CatVariant.PEEK_TWO_CATS) {
                normalSeed = seed
                break
            }
        }
        assertTrue("Brauche normalen Seed", normalSeed >= 0)

        val config = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, normalSeed)
        assertEquals(CatVariant.PEEK_TWO_CATS, config.variant)
    }
}
