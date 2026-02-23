package com.catchit.transit

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// --- Haltestellensuche: /locations?query=... ---

@JsonClass(generateAdapter = true)
data class StopLocation(
    val type: String? = null,
    val id: String? = null,
    val name: String? = null,
    val location: GeoLocation? = null
)

@JsonClass(generateAdapter = true)
data class GeoLocation(
    val latitude: Double? = null,
    val longitude: Double? = null
)

// --- Abfahrten: /stops/{id}/departures ---

@JsonClass(generateAdapter = true)
data class DeparturesResponse(
    val departures: List<Departure> = emptyList()
)

@JsonClass(generateAdapter = true)
data class Departure(
    val tripId: String? = null,
    val direction: String? = null,
    val line: TransitLine? = null,

    // Tatsaechliche Abfahrt (mit Verspaetung eingerechnet)
    @Json(name = "when")
    val actualWhen: String? = null,

    // Geplante Abfahrt (Fahrplan)
    val plannedWhen: String? = null,

    // Verspaetung in Sekunden (null = keine Echtzeitdaten)
    val delay: Int? = null,

    val platform: String? = null
)

@JsonClass(generateAdapter = true)
data class TransitLine(
    val name: String? = null,
    val productName: String? = null,
    val mode: String? = null
)
