TASK: Make this Android project buildable out-of-the-box AND simplify Gradle (NO version catalog).

GOALS
1) Repo must build via command line on a fresh machine:
   ./gradlew assembleDebug
2) Remove version catalog usage completely (no gradle/libs.versions.toml, no libs.* aliases).
3) Keep the current UI/logic as-is (CatPoster, SceneLogic, Dock-Flow), only fix build + robustness issues.
4) Use stable SDK versions: compileSdk=34, targetSdk=34, minSdk=26.
5) Ensure the "BlendMode.Clear grin cutout" works reliably via Offscreen compositing.

REQUIRED OUTPUT
- Provide the complete file tree (paths) and full file contents for ALL files that must be created/changed.
- Ensure no missing placeholders like "AndroidManifest.xml (bereinigt)" without actual XML.
- Then provide a single unified diff patch (git apply compatible) as well.

STEPS
A) Add Gradle Wrapper files to repo (MUST be committed):
- gradlew
- gradlew.bat
- gradle/wrapper/gradle-wrapper.properties
- gradle/wrapper/gradle-wrapper.jar
Use a compatible Gradle version for AGP 8.2.x (e.g. Gradle 8.2/8.3). Ensure wrapper points to that distribution.

B) Root Gradle setup (SIMPLE)
Create/ensure these exist:
- settings.gradle.kts
- build.gradle.kts
- gradle.properties (optional, but ok)
Do NOT use version catalogs.

settings.gradle.kts should include repositories:
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = "CatchIt"
include(":app")

Root build.gradle.kts:
plugins {
  id("com.android.application") version "8.2.0" apply false
  id("org.jetbrains.kotlin.android") version "1.9.20" apply false
}

C) App module Gradle (NO libs.*)
app/build.gradle.kts must be fully explicit:
plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android {
  namespace = "com.catchit"
  compileSdk = 34
  defaultConfig {
    applicationId = "com.catchit"
    minSdk = 26
    targetSdk = 34
    versionCode = 1
    versionName = "1.0"
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
  }
  buildTypes { release { isMinifyEnabled = false } }
  compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
  kotlinOptions { jvmTarget = "17" }
  buildFeatures { compose = true }
  composeOptions { kotlinCompilerExtensionVersion = "1.5.1" }
}

dependencies {
  val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
  implementation("androidx.core:core-ktx:1.12.0")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
  implementation("androidx.activity:activity-compose:1.8.2")
  implementation(composeBom)
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-graphics")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.compose.material3:material3")
  debugImplementation("androidx.compose.ui:ui-tooling")
  testImplementation("junit:junit:4.13.2")
}

NOTE: If any versions mismatch, adjust minimally but keep it stable.

D) Provide FULL AndroidManifest.xml
app/src/main/AndroidManifest.xml must include:
- <application ... >
- MainActivity as LAUNCHER
- No backup_rules/data_extraction_rules unless corresponding files exist.

E) Fix any code compile issues
- Ensure CatPoster.kt imports graphicsLayer and CompositingStrategy.
- Keep Modifier.graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen } on the Canvas to make BlendMode.Clear cutouts work.
- Fix any "light system bars" naming/logic confusion: light status bars means dark icons. Use background luminance to decide.

F) Tests (minimal)
Add/ensure a unit test verifying:
- mapStateToScene deterministic for same inputs
- weird companion can only appear when phase==ASKING and never when alertLevel==ALERT
Make tests bounded (no infinite loops).

G) README
Update root README with:
- How to build: ./gradlew assembleDebug
- How to run: open in Android Studio, run app
- Mention Android-only direction.

CONSTRAINTS
- ASCII only in generated text (avoid emojis/special chars).
- Do NOT add extra architecture frameworks.
- Do NOT add new features. Only make it build + keep current behavior.