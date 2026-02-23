package com.catchit.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.catchit.logic.AlertLevel
import com.catchit.logic.BrandBlack
import com.catchit.logic.BrandWhite
import com.catchit.logic.FlowPhase
import com.catchit.logic.alertFromMinutes
import com.catchit.logic.mapStateToScene
import com.catchit.transit.DisplayDeparture
import com.catchit.transit.StopLocation
import com.catchit.transit.TransitRepository
import com.catchit.ui.graphics.CatPoster
import kotlinx.coroutines.delay

// ========================================================================
// HomeScreen: Hauptscreen mit Haltestellensuche + Live-Abfahrten
// ========================================================================

@Composable
fun HomeScreen() {
    val focusManager = LocalFocusManager.current
    val repo = remember { TransitRepository() }

    // --- State ---
    var seed by remember { mutableIntStateOf(42) }
    var phase by remember { mutableStateOf(FlowPhase.ASKING) }
    var alertLevel by remember { mutableStateOf(AlertLevel.CALM) }

    // Suche
    var searchQuery by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<StopLocation>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }

    // Ausgewaehlte Haltestelle
    var selectedStop by remember { mutableStateOf<StopLocation?>(null) }

    // Abfahrten
    var departures by remember { mutableStateOf<List<DisplayDeparture>>(emptyList()) }
    var isLoadingDepartures by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Naechste Abfahrt (fuer Urgency-Berechnung)
    var nextDepartureMinutes by remember { mutableLongStateOf(Long.MAX_VALUE) }

    // --- Debounced Suche (300ms Verzoegerung) ---
    LaunchedEffect(searchQuery) {
        if (searchQuery.length < 2) {
            searchResults = emptyList()
            return@LaunchedEffect
        }
        isSearching = true
        delay(300)
        repo.searchStops(searchQuery).fold(
            onSuccess = { searchResults = it },
            onFailure = { searchResults = emptyList() }
        )
        isSearching = false
    }

    // --- Auto-Refresh Abfahrten alle 30s ---
    LaunchedEffect(selectedStop) {
        val stop = selectedStop ?: return@LaunchedEffect
        val stopId = stop.id ?: return@LaunchedEffect

        while (true) {
            isLoadingDepartures = departures.isEmpty()
            repo.getDepartures(stopId).fold(
                onSuccess = { deps ->
                    departures = deps
                    errorMessage = null

                    // Urgency berechnen
                    val nearest = deps.firstOrNull()?.minutesUntil ?: Long.MAX_VALUE
                    nextDepartureMinutes = nearest
                    alertLevel = if (nearest == Long.MAX_VALUE) AlertLevel.CALM
                                 else alertFromMinutes(nearest)
                    phase = if (deps.isEmpty()) FlowPhase.IDLE else FlowPhase.TRACKING
                },
                onFailure = { e ->
                    errorMessage = "Keine Verbindung: ${e.message?.take(50)}"
                }
            )
            isLoadingDepartures = false
            delay(30_000) // Alle 30 Sekunden aktualisieren
        }
    }

    // --- Scene berechnen ---
    val scene = mapStateToScene(phase, alertLevel, seed)

    // --- UI ---
    Box(modifier = Modifier.fillMaxSize()) {
        // Hintergrund: Katzen-Poster
        CatPoster(config = scene, seed = seed)

        // Vordergrund
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 16.dp)
        ) {
            // App-Header
            Text(
                "CatchIt",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Black,
                color = scene.contentColor
            )

            if (selectedStop == null) {
                // ============================================================
                // PHASE 1: Haltestellensuche
                // ============================================================
                Text(
                    "Wohin musst du?",
                    style = MaterialTheme.typography.titleLarge,
                    color = scene.contentColor.copy(alpha = 0.7f)
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Suchfeld
                SearchField(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    onSearch = { focusManager.clearFocus() },
                    contentColor = scene.contentColor,
                    bgLuminance = scene.backgroundColor.luminance()
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Loading-Indikator
                if (isSearching) {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = scene.contentColor,
                            strokeWidth = 2.dp
                        )
                    }
                }

                // Suchergebnisse
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(searchResults, key = { it.id ?: it.hashCode() }) { stop ->
                        StopCard(
                            stop = stop,
                            bgLuminance = scene.backgroundColor.luminance(),
                            onSelect = {
                                selectedStop = stop
                                searchQuery = ""
                                searchResults = emptyList()
                                focusManager.clearFocus()
                                seed++
                            }
                        )
                    }
                }

            } else {
                // ============================================================
                // PHASE 2: Abfahrten anzeigen
                // ============================================================
                val stop = selectedStop!!

                // Haltestellenname
                Text(
                    stop.name ?: "Haltestelle",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = scene.contentColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                // Naechste Abfahrt prominent
                if (nextDepartureMinutes < Long.MAX_VALUE) {
                    Text(
                        text = if (nextDepartureMinutes <= 0) "Jetzt abfahren!"
                               else "Nächste in $nextDepartureMinutes min",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Black,
                        color = scene.contentColor.copy(alpha = 0.8f)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Error
                errorMessage?.let { err ->
                    Surface(
                        color = Color.Red.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            err,
                            color = scene.contentColor,
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Loading
                AnimatedVisibility(isLoadingDepartures, enter = fadeIn(), exit = fadeOut()) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = scene.contentColor)
                    }
                }

                // Abfahrtsliste
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(
                        departures,
                        key = { "${it.lineName}-${it.direction}-${it.plannedTime}" }
                    ) { dep ->
                        DepartureCard(
                            departure = dep,
                            bgLuminance = scene.backgroundColor.luminance()
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Andere Haltestelle waehlen
                OutlinedButton(
                    onClick = {
                        selectedStop = null
                        departures = emptyList()
                        phase = FlowPhase.ASKING
                        alertLevel = AlertLevel.CALM
                        nextDepartureMinutes = Long.MAX_VALUE
                        errorMessage = null
                        seed++
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text("Andere Haltestelle", color = scene.contentColor)
                }
            }
        }
    }
}

// ========================================================================
// Suchfeld
// ========================================================================

@Composable
private fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    contentColor: Color,
    bgLuminance: Float
) {
    val fieldBg = if (bgLuminance > 0.5f) Color.White else Color.Black.copy(alpha = 0.3f)

    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        placeholder = {
            Text("Haltestelle suchen...", color = contentColor.copy(alpha = 0.4f))
        },
        singleLine = true,
        shape = RoundedCornerShape(20.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = contentColor,
            unfocusedTextColor = contentColor,
            cursorColor = contentColor,
            focusedBorderColor = contentColor.copy(alpha = 0.5f),
            unfocusedBorderColor = contentColor.copy(alpha = 0.2f),
            focusedContainerColor = fieldBg,
            unfocusedContainerColor = fieldBg
        ),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { onSearch() }),
        modifier = Modifier.fillMaxWidth()
    )
}

// ========================================================================
// Haltestellen-Karte (Suchergebnis)
// ========================================================================

@Composable
private fun StopCard(
    stop: StopLocation,
    bgLuminance: Float,
    onSelect: () -> Unit
) {
    val cardBg = if (bgLuminance > 0.5f) Color.White else Color.Black.copy(alpha = 0.35f)
    val textColor = if (bgLuminance > 0.5f) BrandBlack else BrandWhite

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable { onSelect() },
        color = cardBg,
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                stop.name ?: "?",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = textColor
            )
        }
    }
}

// ========================================================================
// Abfahrts-Karte (Live-Daten)
// ========================================================================

@Composable
private fun DepartureCard(
    departure: DisplayDeparture,
    bgLuminance: Float
) {
    val cardBg = if (bgLuminance > 0.5f) Color.White else Color.Black.copy(alpha = 0.35f)
    val textColor = if (bgLuminance > 0.5f) BrandBlack else BrandWhite
    val dimColor = textColor.copy(alpha = 0.5f)

    // Urgency-Farbe fuer Minuten-Anzeige
    val minuteColor = when {
        departure.minutesUntil <= 3  -> Color(0xFFD60000)
        departure.minutesUntil <= 8  -> Color(0xFFFF7A00)
        else                         -> textColor
    }

    Surface(
        color = cardBg,
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Linien-Badge
            Surface(
                color = if (bgLuminance > 0.5f) BrandBlack else BrandWhite,
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    departure.lineName,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (bgLuminance > 0.5f) BrandWhite else BrandBlack
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Richtung + Zeiten
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    departure.direction,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = textColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Row {
                    Text(
                        departure.plannedTime,
                        style = MaterialTheme.typography.bodySmall,
                        color = dimColor
                    )
                    departure.delayMinutes?.let { del ->
                        if (del > 0) {
                            Text(
                                " +${del}'",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFFD60000),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    departure.platform?.let { pl ->
                        Text(
                            " · Gl. $pl",
                            style = MaterialTheme.typography.bodySmall,
                            color = dimColor
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Minuten-Countdown
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = if (departure.minutesUntil <= 0) "jetzt"
                           else "${departure.minutesUntil}",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    color = minuteColor
                )
                if (departure.minutesUntil > 0) {
                    Text(
                        "min",
                        style = MaterialTheme.typography.labelSmall,
                        color = dimColor
                    )
                }
            }
        }
    }
}

/**
 * Berechnet die Luminanz einer Farbe (0=dunkel, 1=hell).
 */
private fun Color.luminance(): Float {
    return red * 0.299f + green * 0.587f + blue * 0.114f
}
