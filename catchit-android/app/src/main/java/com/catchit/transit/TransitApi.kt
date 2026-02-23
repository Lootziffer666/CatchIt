package com.catchit.transit

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * v6.db.transport.rest — Freie API fuer den gesamten deutschen Nahverkehr.
 * Kein API-Key noetig. Basiert auf DB HAFAS.
 *
 * Docs: https://v6.db.transport.rest/
 */
interface TransitApi {

    /**
     * Haltestellensuche per Freitext.
     *
     * Beispiel: /locations?query=Stolberg&results=8&stops=true&addresses=false
     * Gibt eine Liste von Haltestellen zurueck.
     */
    @GET("locations")
    suspend fun searchStops(
        @Query("query") query: String,
        @Query("results") results: Int = 8,
        @Query("stops") stops: Boolean = true,
        @Query("addresses") addresses: Boolean = false,
        @Query("poi") poi: Boolean = false
    ): List<StopLocation>

    /**
     * Naechste Abfahrten von einer Haltestelle.
     *
     * Beispiel: /stops/8003368/departures?duration=60
     * Gibt die naechsten Abfahrten in den kommenden {duration} Minuten zurueck.
     */
    @GET("stops/{stopId}/departures")
    suspend fun getDepartures(
        @Path("stopId") stopId: String,
        @Query("duration") durationMinutes: Int = 60,
        @Query("results") results: Int = 20
    ): DeparturesResponse
}
