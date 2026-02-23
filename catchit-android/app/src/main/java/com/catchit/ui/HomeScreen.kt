package com.catchit.ui

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.SystemClock
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.catchit.logic.AlertLevel
import com.catchit.logic.BrandBlack
import com.catchit.logic.BrandOffWhite
import com.catchit.logic.EtaResult
import com.catchit.logic.FlowPhase
import com.catchit.logic.GeoPoint
import com.catchit.logic.SafetyMode
import com.catchit.logic.computeEta
import com.catchit.logic.mapStateToScene
import com.catchit.ui.graphics.CatPoster
import com.google.android.gms.location.LocationServices
import java.time.LocalTime

enum class TileType {
    JOURNEY_TYPE,
    DESTINATION,
    DEADLINE,
    SAFETY
}

data class TileState(
    val type: TileType,
    val title: String,
    val value: String? = null,
    val focused: Boolean = false
)

@Composable
fun HomeScreen() {
    val context = LocalContext.current
    val view = LocalView.current
    val fusedClient = remember { LocationServices.getFusedLocationProviderClient(context) }
    var seed by remember { mutableIntStateOf((SystemClock.elapsedRealtime() and 0xFFFFFF).toInt()) }
    var phase by remember { mutableStateOf(FlowPhase.ASKING) }
    var alertLevel by remember { mutableStateOf(AlertLevel.CALM) }
    var soundEnabled by remember { mutableStateOf(true) }
    var destination by remember { mutableStateOf<GeoPoint?>(null) }
    var destinationLabel by remember { mutableStateOf<String?>(null) }
    var deadline by remember { mutableStateOf<LocalTime?>(null) }
    var safetyMode by remember { mutableStateOf(SafetyMode.NORMAL) }
    var etaResult by remember { mutableStateOf<EtaResult?>(null) }
    var locationMessage by remember { mutableStateOf("Standort wird erst nach Zielwahl angefragt") }

    val tiles = remember {
        mutableStateListOf(
            TileState(TileType.JOURNEY_TYPE, "Neu oder wiederkehrend", focused = true),
            TileState(TileType.DESTINATION, "Ziel", focused = false),
            TileState(TileType.DEADLINE, "Ankunftszeit", focused = false),
            TileState(TileType.SAFETY, "Sicherheitsmodus", focused = false)
        )
    }

    fun reorderWithFocus(type: TileType) {
        val updated = tiles.map { it.copy(focused = it.type == type) }
        tiles.clear()
        tiles.addAll(updated.sortedByDescending { it.focused })
    }

    fun updateValue(type: TileType, value: String) {
        val updated = tiles.map { item ->
            if (item.type == type) item.copy(value = value, focused = false) else item.copy(focused = false)
        }
        tiles.clear()
        tiles.addAll(updated)
        val next = listOf(TileType.JOURNEY_TYPE, TileType.DESTINATION, TileType.DEADLINE, TileType.SAFETY)
            .firstOrNull { tileType -> tiles.first { it.type == tileType }.value == null }
        if (next != null) {
            reorderWithFocus(next)
        } else {
            phase = FlowPhase.TRACKING
        }
    }

    val permissionsLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val granted = results[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            results[Manifest.permission.ACCESS_FINE_LOCATION] == true
        if (!granted) {
            locationMessage = "Standort wird fuer genaue ETA benoetigt"
            return@rememberLauncherForActivityResult
        }
        fusedClient.lastLocation.addOnSuccessListener { location ->
            if (location == null || destination == null || deadline == null) {
                locationMessage = "Standort momentan nicht verfuegbar"
                return@addOnSuccessListener
            }
            val now = LocalTime.now()
            val result = computeEta(
                nowMinutes = now.hour * 60 + now.minute,
                deadlineMinutes = deadline!!.hour * 60 + deadline!!.minute,
                currentLocation = GeoPoint(location.latitude, location.longitude),
                destination = destination!!,
                safetyMode = safetyMode
            )
            etaResult = result
            alertLevel = result.alertLevel
            phase = if (result.alertLevel == AlertLevel.ALERT) FlowPhase.ALERTING else FlowPhase.TRACKING
            locationMessage = "Standort aktiv"
            seed += 1
        }.addOnFailureListener {
            locationMessage = "Standort konnte nicht gelesen werden"
        }
    }

    val scene = mapStateToScene(phase, alertLevel, seed)

    DisposableEffect(scene.useDarkSystemBarIcons, view) {
        val window = (context as? android.app.Activity)?.window
        if (window != null) {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val controller = WindowInsetsControllerCompat(window, view)
            controller.isAppearanceLightStatusBars = scene.useDarkSystemBarIcons
            controller.isAppearanceLightNavigationBars = scene.useDarkSystemBarIcons
        }
        onDispose { }
    }

    val toneGenerator = remember { ToneGenerator(AudioManager.STREAM_MUSIC, 85) }
    DisposableEffect(Unit) {
        onDispose { toneGenerator.release() }
    }

    LaunchedEffect(soundEnabled) {
        if (soundEnabled) {
            toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP2, 350)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        CatPoster(config = scene)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "CatchIt",
                color = scene.contentColor,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Ton", color = scene.contentColor)
                Switch(checked = soundEnabled, onCheckedChange = { soundEnabled = it })
            }

            ArrivalTile(scene.headline, buildArrivalSubline(etaResult, locationMessage))

            tiles.forEach { tile ->
                TileCard(
                    tile = tile,
                    sceneContentColor = scene.contentColor,
                    onFocus = { reorderWithFocus(tile.type) },
                    onAnswered = { answer ->
                        updateValue(tile.type, answer)
                        when (tile.type) {
                            TileType.JOURNEY_TYPE -> Unit
                            TileType.DESTINATION -> {
                                destination = GeoPoint(52.5200, 13.4050)
                                destinationLabel = answer
                                val coarseGranted = ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                ) == PackageManager.PERMISSION_GRANTED
                                if (!coarseGranted) {
                                    permissionsLauncher.launch(
                                        arrayOf(
                                            Manifest.permission.ACCESS_COARSE_LOCATION,
                                            Manifest.permission.ACCESS_FINE_LOCATION
                                        )
                                    )
                                }
                            }

                            TileType.DEADLINE -> {
                                deadline = if (answer == "In 20 min") {
                                    LocalTime.now().plusMinutes(20)
                                } else {
                                    LocalTime.of(16, 30)
                                }
                            }

                            TileType.SAFETY -> {
                                safetyMode = when (answer) {
                                    "Normal" -> SafetyMode.NORMAL
                                    "Relaxed" -> SafetyMode.RELAXED
                                    else -> SafetyMode.SAFE
                                }
                            }
                        }
                        if (destination != null && deadline != null) {
                            permissionsLauncher.launch(
                                arrayOf(
                                    Manifest.permission.ACCESS_COARSE_LOCATION,
                                    Manifest.permission.ACCESS_FINE_LOCATION
                                )
                            )
                        }
                    }
                )
            }

            if (destinationLabel != null) {
                Text(
                    text = "Ziel: $destinationLabel",
                    color = scene.contentColor,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

private fun buildArrivalSubline(etaResult: EtaResult?, locationMessage: String): String {
    if (etaResult == null) return locationMessage
    val leave = if (etaResult.leaveInMinutes <= 0) "Jetzt los" else "In ${etaResult.leaveInMinutes} min los"
    return "$leave | ETA ${etaResult.etaMinutes} min"
}

@Composable
private fun ArrivalTile(headline: String, subline: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.86f))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = headline,
                color = BrandBlack,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(text = subline, color = BrandBlack, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Composable
private fun TileCard(
    tile: TileState,
    sceneContentColor: Color,
    onFocus: () -> Unit,
    onAnswered: (String) -> Unit
) {
    val tileBg = if (sceneContentColor.luminance() > 0.5f) {
        Color.Black.copy(alpha = 0.32f)
    } else {
        Color.White.copy(alpha = 0.92f)
    }
    val tileFg = if (tileBg.luminance() > 0.5f) BrandBlack else BrandOffWhite

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onFocus() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = tileBg)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(text = tile.title, color = tileFg, fontWeight = FontWeight.SemiBold)
            if (!tile.focused && tile.value != null) {
                Text(text = tile.value, color = tileFg)
            }
            if (tile.focused) {
                when (tile.type) {
                    TileType.JOURNEY_TYPE -> {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { onAnswered("Neu") }) { Text("Neu") }
                            OutlinedButton(onClick = { onAnswered("Wiederkehrend") }) { Text("Wiederkehrend") }
                        }
                    }

                    TileType.DESTINATION -> {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { onAnswered("Schule") }) { Text("Schule") }
                            Button(onClick = { onAnswered("Bahnhof") }) { Text("Bahnhof") }
                        }
                    }

                    TileType.DEADLINE -> {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { onAnswered("16:30") }) { Text("16:30") }
                            OutlinedButton(onClick = { onAnswered("In 20 min") }) { Text("In 20 min") }
                        }
                    }

                    TileType.SAFETY -> {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { onAnswered("Normal") }) { Text("Normal") }
                            OutlinedButton(onClick = { onAnswered("Relaxed") }) { Text("Relaxed") }
                            OutlinedButton(onClick = { onAnswered("Safe") }) { Text("Safe") }
                        }
                    }
                }
            }
        }
    }
}
