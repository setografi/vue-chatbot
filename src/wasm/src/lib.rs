// src/wasm/src/lib.rs
use wasm_bindgen::prelude::*;
use regex::Regex;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct SentimentWord {
    pub base_score: i32,
    pub category: String,
    pub intensity_level: u8, // 1-5
}

#[derive(Serialize, Deserialize)]
pub struct PreprocessedInput {
    pub sanitized: String,
    pub tokens: Vec<String>,
    pub word_count: usize,
}

#[derive(Serialize, Deserialize)]
pub struct SentimentAnalysis {
    pub base_score: i32,
    pub final_score: i32,
    pub primary_emotion: String,
    pub intensity: f32, // 0.0-1.0
    pub context_factors: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ExpressionBlend {
    pub primary_expression: String,
    pub secondary_expression: String,
    pub blend_strength: f32, // 0.0-1.0
}

#[wasm_bindgen]
pub struct MiraCore {
    sentiment_dict: HashMap<String, SentimentWord>,
    negation_words: Vec<String>,
    intensifier_words: HashMap<String, f32>,
    reflective_keywords: Vec<String>,
    playful_keywords: Vec<String>,
    mood_cache: HashMap<String, String>,
    mood_counts: HashMap<String, u32>,
    expression_history: Vec<(String, i32)>, // (expression, timestamp)
}

#[wasm_bindgen]
impl MiraCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let sentiment_dict = Self::build_sentiment_dictionary();
        let intensifier_words = Self::build_intensifiers();
        let negation_words = Self::build_negations();

        let mut mood_counts = HashMap::new();
        mood_counts.insert("chill".to_string(), 0);
        mood_counts.insert("playful".to_string(), 0);
        mood_counts.insert("reflective".to_string(), 0);

        Self {
            sentiment_dict,
            negation_words,
            intensifier_words,
            reflective_keywords: vec![
                "sedih", "galau", "stress", "capek", "lelah", "bingung", "takut", "khawatir",
                "depresi", "putus", "gagal", "susah", "kecewa", "marah", "benci", "frustrasi",
                "kesal", "dongkol", "keenakan", "penakut", "cemas", "resah", "gelisah",
            ]
            .iter()
            .map(|s| s.to_string())
            .collect(),
            playful_keywords: vec![
                "lucu", "haha", "wkwk", "joke", "bercanda", "main", "game", "seru", "asik",
                "tebak", "cerita", "tantang", "ajari", "ajak", "ajaran", "mainan",
            ]
            .iter()
            .map(|s| s.to_string())
            .collect(),
            mood_cache: HashMap::new(),
            mood_counts,
            expression_history: Vec::new(),
        }
    }

    // ========== SENTIMENT DICTIONARY BUILDER ==========
    fn build_sentiment_dictionary() -> HashMap<String, SentimentWord> {
        let mut dict = HashMap::new();

        // POSITIVE EMOTIONS (HIGH INTENSITY)
        let positive_high = vec![
            ("senang", 3),
            ("bahagia", 3),
            ("gembira", 3),
            ("cinta", 3),
            ("love", 3),
            ("suka", 2),
            ("menyukai", 2),
            ("hepi", 3),
            ("happy", 3),
            ("mantap", 2),
            ("keren", 2),
            ("awesome", 2),
            ("amazing", 2),
            ("gemilang", 2),
        ];

        // POSITIVE EMOTIONS (MEDIUM INTENSITY)
        let positive_medium = vec![
            ("bersyukur", 2),
            ("grateful", 2),
            ("makasih", 1),
            ("terima kasih", 1),
            ("thanks", 1),
            ("asik", 1),
            ("seru", 1),
            ("fun", 1),
            ("bagus", 1),
            ("baik", 1),
            ("lumayan", 1),
            ("ok", 1),
            ("oke", 1),
            ("sip", 1),
        ];

        // NEGATIVE EMOTIONS (HIGH INTENSITY)
        let negative_high = vec![
            ("sedih", -3),
            ("depresi", -3),
            ("galau", -2),
            ("takut", -3),
            ("benci", -3),
            ("marah", -2),
            ("putus", -3),
            ("hilang", -2),
            ("down", -2),
            ("nangis", -2),
            ("kecewa", -2),
            ("kesal", -2),
            ("dongkol", -2),
            ("nyesel", -2),
            ("menyesal", -2),
        ];

        // NEGATIVE EMOTIONS (MEDIUM INTENSITY)
        let negative_medium = vec![
            ("stress", -2),
            ("capek", -1),
            ("lelah", -1),
            ("bingung", -1),
            ("khawatir", -1),
            ("cemas", -1),
            ("gagal", -2),
            ("susah", -1),
            ("sulit", -1),
            ("jelek", -1),
            ("buruk", -1),
        ];

        // CURIOUS/SURPRISED (NEUTRAL-POSITIVE)
        let curious = vec![
            ("wow", 2),
            ("gila", 1),
            ("astaga", 1),
            ("serius", 1),
            ("beneran", 1),
            ("penasaran", 1),
            ("tertarik", 1),
            ("ingin", 1),
            ("pengin", 1),
            ("mau", 1),
            ("tanya", 1),
            ("kenapa", 0),
            ("gimana", 0),
            ("apa", 0),
        ];

        // Build dictionary
        for (word, score) in positive_high {
            dict.insert(
                word.to_string(),
                SentimentWord {
                    base_score: score,
                    category: "positive_high".to_string(),
                    intensity_level: 5,
                },
            );
        }

        for (word, score) in positive_medium {
            dict.insert(
                word.to_string(),
                SentimentWord {
                    base_score: score,
                    category: "positive_medium".to_string(),
                    intensity_level: 3,
                },
            );
        }

        for (word, score) in negative_high {
            dict.insert(
                word.to_string(),
                SentimentWord {
                    base_score: score,
                    category: "negative_high".to_string(),
                    intensity_level: 5,
                },
            );
        }

        for (word, score) in negative_medium {
            dict.insert(
                word.to_string(),
                SentimentWord {
                    base_score: score,
                    category: "negative_medium".to_string(),
                    intensity_level: 3,
                },
            );
        }

        for (word, score) in curious {
            dict.insert(
                word.to_string(),
                SentimentWord {
                    base_score: score,
                    category: "curious".to_string(),
                    intensity_level: 2,
                },
            );
        }

        // ========== GEN-Z INDONESIAN SLANG (HIGH IMPACT) ==========
        let gen_z_slang = vec![
            // Amazed/Shocked Positive
            ("bangsat", 2, 3),     // "gila banget, amazed"
            ("gokil", 2, 3),       // "Amazing, wow"
            ("buset", 1, 2),       // "Wow, surprised"
            ("jir", 1, 2),         // "Wow, shocked"
            ("duh", 1, 1),         // Mild surprise
            ("wah", 1, 2),         // Surprise/amazement

            // Intensifiers
            ("sumpah", 1, 2),      // "I swear, emphasis"
            ("asli", 1, 1),        // "Really, for real"
            ("demi", 1, 1),        // Emphasis "by"

            // Negative Slang
            ("tai", -2, 3),        // Harsh negative
            ("najis", -1, 2),      // Disgusting
            ("brengsek", -2, 3),   // Harsh negative
            ("sialan", -2, 3),     // Damn it
            ("sial", -1, 2),       // Unlucky/bad
            ("ngeri", -1, 2),      // Scary/worried
            ("baper", -1, 3),      // Oversensitive/hurt
            ("jebakan", -1, 2),    // Trap/tricked

            // Casual Approvals
            ("mantul", 2, 2),      // "Cool, awesome" (slang)
            ("oke sih", 1, 1),     // Okay fine
            ("yekan", 2, 2),       // "Yeah alright"

            // Casual Disapprovals
            ("gitu aja", -1, 1),   // "That's it? Disappointment"
            ("biasa aja", -1, 1),  // "Just ordinary"
            ("males", -1, 1),      // Lazy/unmotivated
            ("bosnan", -1, 1),     // Boring
        ];

        for (word, score, intensity) in gen_z_slang {
            dict.insert(
                word.to_string(),
                SentimentWord {
                    base_score: score,
                    category: "slang_genZ".to_string(),
                    intensity_level: intensity,
                },
            );
        }

        // ========== CONTEXT-AWARE EXPRESSIONS ==========
        let context_expressions = vec![
            // Questions/Curious
            ("emang", 0, 1),       // "Really? Questioning"
            ("terus", 0, 1),       // "Then? Continuation"
            ("gimana sih", 0, 2),  // "How come?" - curious
            ("kok gitu", 0, 1),    // "Why like that?"
            ("huh", -1, 1),        // Confused/confused

            // Affirmations
            ("iyalah", 1, 1),      // "Obviously dude"
            ("tentu", 1, 1),       // "Of course"
            ("pastinya", 1, 1),    // "Of course"
            ("emang ya", 1, 1),    // "Right?"
        ];

        for (word, score, intensity) in context_expressions {
            dict.insert(
                word.to_string(),
                SentimentWord {
                    base_score: score,
                    category: "context_expression".to_string(),
                    intensity_level: intensity,
                },
            );
        }

        dict
    }

    fn build_intensifiers() -> HashMap<String, f32> {
        let mut intensifiers = HashMap::new();

        // Strong intensifiers
        intensifiers.insert("banget".to_string(), 1.8);
        intensifiers.insert("bgt".to_string(), 1.8);
        intensifiers.insert("banget-banget".to_string(), 2.0);
        intensifiers.insert("sangat".to_string(), 1.7);
        intensifiers.insert("sekali".to_string(), 1.6);
        intensifiers.insert("bet".to_string(), 1.5);
        intensifiers.insert("luar".to_string(), 1.5);

        // Weak intensifiers
        intensifiers.insert("agak".to_string(), 0.6);
        intensifiers.insert("sedikit".to_string(), 0.6);
        intensifiers.insert("lumayan".to_string(), 0.7);
        intensifiers.insert("cukup".to_string(), 0.7);
        intensifiers.insert("kurang".to_string(), 0.5);
        intensifiers.insert("gak terlalu".to_string(), 0.4);
        intensifiers.insert("nggak terlalu".to_string(), 0.4);

        intensifiers
    }

    fn build_negations() -> Vec<String> {
        vec![
            "tidak", "nggak", "gak", "bukan", "engga", "enggak", "no", "nope",
        ]
        .iter()
        .map(|s| s.to_string())
        .collect()
    }

    // ========== PREPROCESSING ==========
    #[wasm_bindgen]
    pub fn preprocess_input(&self, input: &str) -> JsValue {
        let sanitized = input
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("&", "&amp;")
            .trim()
            .to_string();

        let tokens: Vec<String> = sanitized
            .to_lowercase()
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();

        let result = PreprocessedInput {
            sanitized: sanitized.clone(),
            tokens: tokens.clone(),
            word_count: tokens.len(),
        };

        serde_wasm_bindgen::to_value(&result).unwrap()
    }

    // ========== ADVANCED SENTIMENT ANALYSIS ==========
    #[wasm_bindgen]
    pub fn calculate_sentiment_advanced(&self, text: &str) -> JsValue {
        let lower_text = text.to_lowercase();
        let words: Vec<&str> = lower_text.split_whitespace().collect();

        let mut base_score = 0;
        let mut final_score = 0;
        let mut primary_emotion = "neutral".to_string();
        let mut max_intensity = 0u8;
        let mut context_factors = Vec::new();
        let mut negation_active = false;
        let mut intensifier_multiplier = 1.0f32;

        for (_i, word) in words.iter().enumerate() {
            // Check for negation
            if self.negation_words.contains(&word.to_string()) {
                negation_active = true;
                context_factors.push(format!("negation: {}", word));
                continue;
            }

            // Check for intensifiers
            if let Some(&multiplier) = self.intensifier_words.get(*word) {
                intensifier_multiplier = multiplier;
                context_factors.push(format!("intensifier: {} ({}x)", word, multiplier));
                continue;
            }

            // Check sentiment dictionary
            if let Some(sentiment_word) = self.sentiment_dict.get(*word) {
                let mut word_score = sentiment_word.base_score as f32 * intensifier_multiplier;

                if negation_active {
                    word_score = -word_score;
                    context_factors.push(format!("negated: {}", word));
                    negation_active = false;
                }

                base_score += sentiment_word.base_score;
                final_score += word_score as i32;

                if sentiment_word.intensity_level > max_intensity {
                    max_intensity = sentiment_word.intensity_level;
                    primary_emotion = sentiment_word.category.clone();
                }

                intensifier_multiplier = 1.0;
            }
        }

        let intensity = (max_intensity as f32) / 5.0;

        let analysis = SentimentAnalysis {
            base_score,
            final_score,
            primary_emotion,
            intensity,
            context_factors,
        };

        serde_wasm_bindgen::to_value(&analysis).unwrap()
    }

    /// Legacy method for backward compatibility
    #[wasm_bindgen]
    pub fn calculate_sentiment(&self, text: &str) -> i32 {
        let lower_text = text.to_lowercase();
        let words: Vec<&str> = lower_text.split_whitespace().collect();

        let mut score = 0;
        for word in words {
            if let Some(sentiment_word) = self.sentiment_dict.get(word) {
                score += sentiment_word.base_score;
            }
        }

        score
    }

    // ========== MOOD DETECTION ==========
    #[wasm_bindgen]
    pub fn detect_mood(&mut self, user_input: &str) -> String {
        let lower_input = user_input.to_lowercase();

        if let Some(cached_mood) = self.mood_cache.get(&lower_input) {
            return cached_mood.clone();
        }

        let sentiment_score = self.calculate_sentiment(&lower_input);

        let mood = if sentiment_score < -4 {
            "reflective" // Deep negative emotions
        } else if sentiment_score > 4 {
            "playful" // Strong positive emotions
        } else if sentiment_score > 0 {
            "playful" // Mild positive
        } else if sentiment_score < -1 {
            "reflective" // Mild negative
        } else if self.reflective_keywords.iter().any(|kw| lower_input.contains(kw)) {
            "reflective"
        } else if self.playful_keywords.iter().any(|kw| lower_input.contains(kw)) {
            "playful"
        } else {
            "chill"
        }
        .to_string();

        *self.mood_counts.entry(mood.clone()).or_insert(0) += 1;
        self.mood_cache.insert(lower_input, mood.clone());

        mood
    }

    #[wasm_bindgen]
    pub fn get_dominant_mood(&self) -> String {
        self.mood_counts
            .iter()
            .max_by_key(|&(_, count)| count)
            .map(|(mood, _)| mood.clone())
            .unwrap_or_else(|| "chill".to_string())
    }

    #[wasm_bindgen]
    pub fn calculate_mood_transition(&self, current_mood: &str, sentiment_score: i32) -> String {
        match (current_mood, sentiment_score) {
            ("chill", s) if s < -4 => "reflective".to_string(),
            ("chill", s) if s > 4 => "playful".to_string(),
            ("playful", s) if s < -3 => "chill".to_string(),
            ("reflective", s) if s > 3 => "chill".to_string(),
            _ => current_mood.to_string(),
        }
    }

    // ========== EXPRESSION DETECTION & BLENDING ==========
#[wasm_bindgen]
pub fn detect_expression(&self, text: &str) -> String {
    #[derive(Deserialize)]
    struct ExpressionDetection {
        primary: String,
        secondary: String,
        intensity: f32,
        confidence: f32,
    }

    let result = self.detect_expression_with_intensity(text);
    let detection: ExpressionDetection = serde_wasm_bindgen::from_value(result).unwrap();
    detection.primary
}


    /// Advanced expression detection dengan secondary emotion
    #[wasm_bindgen]
    pub fn detect_expression_with_intensity(&self, text: &str) -> JsValue {
        let sentiment_score = self.calculate_sentiment(text);
        let lower_text = text.to_lowercase();

        let primary = if sentiment_score >= 3 {
            "f02" // happy
        } else if sentiment_score <= -3 {
            "f03" // sad
        } else if sentiment_score >= 1 {
            if lower_text.contains("wow") || lower_text.contains("gila") {
                "f04" // surprised
            } else {
                "f02" // happy (mild)
            }
        } else if sentiment_score <= -1 {
            "f03" // sad (mild)
        } else if lower_text.contains("bingung") || lower_text.contains("gimana") {
            "f04" // confused/surprised
        } else {
            "f01" // default
        }
        .to_string();

        // Determine secondary emotion for blending
        let secondary = if lower_text.contains("penasaran") || lower_text.contains("tertarik") {
            "f04".to_string() // curious
        } else if lower_text.contains("nangis") {
            "f03".to_string() // sad
        } else {
            "f01".to_string() // default
        };

        let intensity = (sentiment_score.abs() as f32 / 5.0).min(1.0);

        #[derive(Serialize)]
        struct ExpressionDetection {
            primary: String,
            secondary: String,
            intensity: f32,
            confidence: f32,
        }

        let detection = ExpressionDetection {
            primary,
            secondary,
            intensity,
            confidence: (1.0 - intensity * 0.2).max(0.6), // Confidence degrades with ambiguity
        };

        serde_wasm_bindgen::to_value(&detection).unwrap()
    }

    /// Map emotion to Live2D expression with blending
    #[wasm_bindgen]
    pub fn blend_expressions(&self, emotion_score: i32, context: &str) -> JsValue {
        let lower_context = context.to_lowercase();

        let (primary, secondary) = match emotion_score {
            s if s >= 3 => ("f02", "f04"), // happy + surprised blend
            s if s <= -3 => ("f03", "f01"), // sad + neutral blend
            s if s > 0 => {
                if lower_context.contains("joke") || lower_context.contains("game") {
                    ("f02", "f04")
                } else {
                    ("f02", "f01")
                }
            }
            s if s < 0 => ("f03", "f01"),
            _ => ("f01", "f01"),
        };

        let blend_strength = (emotion_score.abs() as f32 / 5.0).min(1.0);

        let blend = ExpressionBlend {
            primary_expression: primary.to_string(),
            secondary_expression: secondary.to_string(),
            blend_strength,
        };

        serde_wasm_bindgen::to_value(&blend).unwrap()
    }

    // ========== HUMANIZATION ==========
    #[wasm_bindgen]
    pub fn humanize_response(&self, response: &str) -> String {
        let mut humanized = response.to_string();

        let replacements = [
            ("Saya memahami", "Aku ngerti"),
            ("Saya mengerti", "Iya paham"),
            ("Saya merasa", "Aku rasa"),
            ("Apakah ada", "Ada"),
            ("Terima kasih telah", "Oke sip"),
            ("Saya akan", "Aku bakal"),
            ("Saya bisa", "Aku bisa"),
            ("Maaf jika", "Sorry kalau"),
            ("Silakan", "Coba"),
            ("Mohon", "Tolong"),
        ];

        for (formal, casual) in &replacements {
            let re = Regex::new(&format!("(?i){}", regex::escape(formal))).unwrap();
            humanized = re.replace_all(&humanized, *casual).to_string();
        }

        let sentences: Vec<&str> = humanized
            .split(|c| c == '.' || c == '!' || c == '?')
            .filter(|s| !s.trim().is_empty())
            .collect();

        if sentences.len() > 3 {
            humanized = sentences[..3].join(". ") + ".";
        }

        if js_sys::Math::random() < 0.1 {
            let fillers = ["hmm... ", "eh iya, ", "btw, ", "oh iya, "];
            let idx = (js_sys::Math::random() * fillers.len() as f64) as usize;
            humanized = format!("{}{}", fillers[idx], humanized);
        }

        humanized.trim().to_string()
    }

    // ========== UTILITY METHODS ==========
    #[wasm_bindgen]
    pub fn build_conversation_context(&self, messages: Vec<String>) -> String {
        let mut context = String::new();
        for (i, msg) in messages.iter().enumerate() {
            let role = if i % 2 == 0 { "User" } else { "MIRA" };
            context.push_str(&format!("{}: {}\n", role, msg));
        }
        context
    }

    #[wasm_bindgen]
    pub fn extract_topics(&self, messages: Vec<String>) -> Vec<String> {
        let text = messages.join(" ").to_lowercase();
        let words: Vec<&str> = text
            .split_whitespace()
            .filter(|w| w.len() > 3)
            .collect();

        let mut word_freq: HashMap<String, usize> = HashMap::new();
        for word in words {
            *word_freq.entry(word.to_string()).or_insert(0) += 1;
        }

        let mut freq_vec: Vec<_> = word_freq.into_iter().collect();
        freq_vec.sort_by(|a, b| b.1.cmp(&a.1));

        freq_vec
            .into_iter()
            .take(5)
            .map(|(word, _)| word)
            .collect()
    }

    #[wasm_bindgen]
    pub fn generate_riddle(&self) -> JsValue {
        let riddles = vec![
            ("Aku selalu ada di depan, tapi tak pernah jadi yang pertama. Apa aku?", "hidung"),
            ("Aku bulat, bisa nyanyi, tapi bukan penyanyi. Apa aku?", "cd"),
            ("Apa yang naik tapi gak pernah turun?", "umur"),
            ("Aku punya ekor tapi bukan binatang. Apa aku?", "koin"),
            ("Dibanting ga marah, malah seneng. Apa itu?", "bola"),
        ];

        let idx = (js_sys::Math::random() * riddles.len() as f64) as usize;
        let (question, answer) = riddles[idx];

        #[derive(Serialize)]
        struct Riddle {
            question: String,
            answer: String,
        }

        let riddle = Riddle {
            question: question.to_string(),
            answer: answer.to_string(),
        };

        serde_wasm_bindgen::to_value(&riddle).unwrap()
    }

    #[wasm_bindgen]
    pub fn get_offline_response(&self) -> String {
        let responses = vec![
            "Haha, jaringan lagi lelet nih. Ceritain apa aja dulu deh!",
            "Ups, APIku ngambek. Ngobrol apa lagi ya?",
            "Aduh, offline mode dulu ya. Kamu lagi apa?",
            "Wah koneksi lg jelek. Tapi aku tetep dengerin kok!",
            "Error nih, tapi gas aja cerita. Ntar aku sambung lagi",
        ];

        let idx = (js_sys::Math::random() * responses.len() as f64) as usize;
        responses[idx].to_string()
    }

    #[wasm_bindgen]
    pub fn interpolate_expression(&self, _current: &str, target: &str, _progress: f32) -> String {
        target.to_string()
    }
}

// ========== EXPRESSION INTERPOLATION ==========
#[derive(Serialize, Deserialize, Clone)]
pub struct ExpressionInterpolator {
    pub from_expression: String,
    pub to_expression: String,
    pub start_time: i64,
    pub duration_ms: i64,
}

impl ExpressionInterpolator {
    pub fn new(from: String, to: String, duration_ms: i64) -> Self {
        Self {
            from_expression: from,
            to_expression: to,
            start_time: js_sys::Date::now() as i64,
            duration_ms,
        }
    }

    /// Cubic easing function (ease-in-out)
    fn ease_in_out_cubic(t: f32) -> f32 {
        if t < 0.5 {
            4.0 * t * t * t
        } else {
            1.0 - (-2.0 * t + 2.0).powi(3) / 2.0
        }
    }

    pub fn get_progress(&self) -> (String, f32, bool) {
        let now = js_sys::Date::now() as i64;
        let elapsed = (now - self.start_time) as f32;
        let progress = (elapsed / self.duration_ms as f32).min(1.0);

        let eased_progress = Self::ease_in_out_cubic(progress);
        let is_complete = progress >= 1.0;

        (self.to_expression.clone(), eased_progress, is_complete)
    }
}

#[wasm_bindgen]
impl MiraCore {
    // Add method baru (di akhir impl block, sebelum closing brace)
    #[wasm_bindgen]
    pub fn create_expression_interpolator(
        &self,
        from: String,
        to: String,
        duration_ms: i64,
    ) -> JsValue {
        let interpolator = ExpressionInterpolator::new(from, to, duration_ms);
        serde_wasm_bindgen::to_value(&interpolator).unwrap()
    }

    #[wasm_bindgen]
    pub fn interpolate_expression_smooth(&self, _from: &str, _to: &str, progress: f32) -> f32 {
        // Return eased progress (0.0-1.0)
        if progress < 0.5 {
            4.0 * progress * progress * progress
        } else {
            1.0 - (-2.0 * progress + 2.0).powi(3) / 2.0
        }
    }
}

// Standalone functions
#[wasm_bindgen]
pub fn quick_mood_check(input: &str) -> String {
    let mut core = MiraCore::new();
    core.detect_mood(input)
}

#[wasm_bindgen]
pub fn polish_text(text: &str) -> String {
    let core = MiraCore::new();
    core.humanize_response(text)
}