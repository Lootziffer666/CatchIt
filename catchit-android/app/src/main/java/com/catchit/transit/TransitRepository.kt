package com.catchit.transit

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.time.OffsetDateTime
import java.time.Duration

/**
 * Aufbereitete Abfahrt fuer die UI.
 * Nur die Felder die angezeigt werden.
 */
data class DisplayDeparture(
    val lineName: String,        // "RE 5", "S13", "Bus 601"
    val direction: String,       // "Bonn Hbf"
    val minutesUntil: Long,      // Minuten bis Abfahrt (Live)
    val platform: String?,       // Gleis/Steig
    val delayMinutes: Int?,      // Verspaetung in Minuten (null = keine Daten)
    val plannedTime: String,     // "14:30"
    val liveTime: String         // "14:32" (oder gleich wie planned)
)

/**
 * Repository: Einziger Zugangspunkt fuer Transit-Daten.
 * Wird einmal erstellt und ueberall wiederverwendet.
 */
class TransitRepository {

    private val moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val api: TransitApi = Retrofit.Builder()
        .baseUrl("https://v6.db.transport.rest/")
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()
        .create(TransitApi::class.java)

    /**
     * Sucht Haltestellen nach Freitext.
     * Gibt nur echte Haltestellen zurueck (keine Adressen/POIs).
     */
    suspend fun searchStops(query: String): Result<List<StopLocation>> {
        return try {
            val stops = api.searchStops(query)
                .filter { it.type == "stop" && it.id != null && it.name != null }
            Result.success(stops)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Holt die naechsten Abfahrten und bereitet sie fuer die UI auf.
     * Berechnet "Minuten bis Abfahrt" relativ zu jetzt.
     */
    suspend fun getDepartures(stopId: String): Result<List<DisplayDeparture>> {
        return try {
            val departures = api.getDepartures(stopId)
            val now = OffsetDateTime.now()

            val display = departures.mapNotNull { dep ->
                val line = dep.line?.name ?: return@mapNotNull null
                val dir = dep.direction ?: "?"

                // Abfahrtszeit parsen (ISO 8601 mit Zeitzone)
                val liveTime = dep.actualWhen?.let { parseTime(it) }
                val plannedTime = dep.plannedWhen?.let { parseTime(it) }
                val displayTime = liveTime ?: plannedTime ?: return@mapNotNull null

                val minutesUntil = Duration.between(now, displayTime).toMinutes()

                // Vergangene Abfahrten ignorieren
                if (minutesUntil < -1) return@mapNotNull null

                val delayMin = dep.delay?.let { it / 60 }

                DisplayDeparture(
                    lineName = line,
                    direction = dir,
                    minutesUntil = maxOf(0, minutesUntil),
                    platform = dep.platform,
                    delayMinutes = delayMin,
                    plannedTime = plannedTime?.let { formatHHMM(it) } ?: "--:--",
                    liveTime = liveTime?.let { formatHHMM(it) } ?: formatHHMM(displayTime)
                )
            }.sortedBy { it.minutesUntil }

            Result.success(display)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun parseTime(iso: String): OffsetDateTime? {
        return try {
            OffsetDateTime.parse(iso)
        } catch (_: Exception) {
            null
        }
    }

    private fun formatHHMM(time: OffsetDateTime): String {
        return "%02d:%02d".format(time.hour, time.minute)
    }
}
