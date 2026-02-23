package com.catchit.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LogicTest {

    @Test
    fun haversineSanity() {
        val berlin = GeoPoint(52.5200, 13.4050)
        val munich = GeoPoint(48.1351, 11.5820)
        val distance = haversineKm(berlin, munich)
        assertTrue(distance > 450.0)
        assertTrue(distance < 600.0)
    }

    @Test
    fun alertMappingThresholds() {
        assertEquals(AlertLevel.CALM, mapLeaveInToAlert(16))
        assertEquals(AlertLevel.READY, mapLeaveInToAlert(15))
        assertEquals(AlertLevel.READY, mapLeaveInToAlert(6))
        assertEquals(AlertLevel.WARNING, mapLeaveInToAlert(5))
        assertEquals(AlertLevel.WARNING, mapLeaveInToAlert(0))
        assertEquals(AlertLevel.ALERT, mapLeaveInToAlert(-1))
    }

    @Test
    fun computeEtaUsesSafetyBuffer() {
        val now = 10 * 60
        val deadline = 10 * 60 + 30
        val point = GeoPoint(52.52, 13.405)
        val relaxed = computeEta(now, deadline, point, point, SafetyMode.RELAXED)
        val safe = computeEta(now, deadline, point, point, SafetyMode.SAFE)

        assertEquals(0, relaxed.etaMinutes)
        assertEquals(23, relaxed.leaveInMinutes)
        assertEquals(18, safe.leaveInMinutes)
        assertEquals(AlertLevel.CALM, relaxed.alertLevel)
    }

    @Test
    fun sceneMappingIsDeterministic() {
        val one = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, seed = 123456)
        val two = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, seed = 123456)
        assertEquals(one, two)
    }

    @Test
    fun weirdCompanionConstraints() {
        for (seed in 0..10_000 step 137) {
            val allowedScene = mapStateToScene(FlowPhase.ASKING, AlertLevel.CALM, seed)
            if (allowedScene.variant == CatVariant.COMPANION_WEIRD) {
                assertTrue(companionIsAllowed(FlowPhase.ASKING, AlertLevel.CALM))
            }
            val blockedByPhase = mapStateToScene(FlowPhase.TRACKING, AlertLevel.CALM, seed)
            assertFalse(blockedByPhase.variant == CatVariant.COMPANION_WEIRD)

            val blockedByAlert = mapStateToScene(FlowPhase.ASKING, AlertLevel.ALERT, seed)
            assertFalse(blockedByAlert.variant == CatVariant.COMPANION_WEIRD)
        }
    }
}
