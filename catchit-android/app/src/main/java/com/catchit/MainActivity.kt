package com.catchit

import android.media.MediaPlayer
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.catchit.ui.HomeScreen
import com.catchit.ui.theme.CatchItTheme

class MainActivity : ComponentActivity() {

    private var meowPlayer: MediaPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Vollbild-Poster-Look (Inhalt geht bis unter Statusbar/Navbar)
        enableEdgeToEdge()

        // Miau beim Start abspielen (wenn Sound-Datei vorhanden)
        playMeow()

        setContent {
            CatchItTheme {
                HomeScreen()
            }
        }
    }

    /**
     * Spielt cutecatmeow.mp3 beim App-Start ab.
     * Die Datei liegt in res/raw/cutecatmeow.mp3.
     * Spaeter ueber Settings abschaltbar (DataStore/SharedPrefs).
     */
    private fun playMeow() {
        try {
            val resId = resources.getIdentifier("cutecatmeow", "raw", packageName)
            if (resId != 0) {
                meowPlayer = MediaPlayer.create(this, resId)
                meowPlayer?.setOnCompletionListener { mp ->
                    mp.release()
                    meowPlayer = null
                }
                meowPlayer?.start()
            }
        } catch (_: Exception) {
            // Kein Crash wenn Datei fehlt -- Sound ist optional
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        meowPlayer?.release()
        meowPlayer = null
    }
}
