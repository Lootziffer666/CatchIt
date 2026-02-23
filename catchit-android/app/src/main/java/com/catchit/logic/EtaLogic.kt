package com.catchit.logic

import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

data class GeoPoint(val lat: Double, val lon: Double)

enum class SafetyMode(val bufferMinutes: Int) {
    NORMAL(3),
    RELAXED(7),
    SAFE(12)
}

data class EtaResult(
    val etaMinutes: Int,
    val leaveInMinutes: Int,
    val alertLevel: AlertLevel
)

fun haversineKm(from: GeoPoint, to: GeoPoint): Double {
    val earthRadiusKm = 6371.0
    val dLat = Math.toRadians(to.lat - from.lat)
    val dLon = Math.toRadians(to.lon - from.lon)
    val lat1 = Math.toRadians(from.lat)
    val lat2 = Math.toRadians(to.lat)

    val a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return earthRadiusKm * c
}

fun walkingEtaMinutes(distanceKm: Double, walkingSpeedKmH: Double = 4.8): Int {
    val hours = distanceKm / walkingSpeedKmH
    return (hours * 60.0).roundToInt().coerceAtLeast(0)
}

fun mapLeaveInToAlert(leaveInMinutes: Int): AlertLevel {
    return when {
        leaveInMinutes > 15 -> AlertLevel.CALM
        leaveInMinutes in 6..15 -> AlertLevel.READY
        leaveInMinutes in 0..5 -> AlertLevel.WARNING
        else -> AlertLevel.ALERT
    }
}

fun computeEta(
    nowMinutes: Int,
    deadlineMinutes: Int,
    currentLocation: GeoPoint,
    destination: GeoPoint,
    safetyMode: SafetyMode
): EtaResult {
    val distance = haversineKm(currentLocation, destination)
    val eta = walkingEtaMinutes(distance)
    val leaveIn = deadlineMinutes - nowMinutes - eta - safetyMode.bufferMinutes
    val level = mapLeaveInToAlert(leaveIn)
    return EtaResult(etaMinutes = eta, leaveInMinutes = leaveIn, alertLevel = level)
}
