package com.catchit.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class SceneLogicTest {

    @Test
    fun mapStateToScene_isDeterministic_forSameInputs() {
        val a = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, seed = 1337)
        val b = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, seed = 1337)
        assertEquals(a, b)
    }

    @Test
    fun weirdCompanion_onlyWhenAsking_andNeverWhenAlert() {
        // seed=0 => hash=0 => (hash % 100) < 8 is ALWAYS true
        val seed = 0

        val askingCalm = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, seed)
        assertEquals(CatVariant.COMPANION_WEIRD, askingCalm.variant)

        val notAsking = mapStateToScene(FlowPhase.TRACKING, AlertLevel.CALM, seed)
        assertNotEquals(CatVariant.COMPANION_WEIRD, notAsking.variant)

        val askingAlert = mapStateToScene(FlowPhase.ASKING, AlertLevel.ALERT, seed)
        assertNotEquals(CatVariant.COMPANION_WEIRD, askingAlert.variant)
    }
}
