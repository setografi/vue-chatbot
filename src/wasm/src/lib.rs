// src/wasm/src/lib.rs
use wasm_bindgen::prelude::*;
use regex::Regex;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct PreprocessedInput {
    pub sanitized: String,
    pub tokens: Vec<String>,
    pub word_count: usize,
}

#[wasm_bindgen]
pub struct MiraCore {
    reflective_keywords: Vec<String>,
    playful_keywords: Vec<String>,
    mood_cache: HashMap<String, String>,
    mood_counts: HashMap<String, u32>,
    sentiment_dict: HashMap<String, i32>,
}

#[wasm_bindgen]
impl MiraCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let mut mood_counts = HashMap::new();
        mood_counts.insert("chill".to_string(), 0);
        mood_counts.insert("playful".to_string(), 0);
        mood_counts.insert("reflective".to_string(), 0);

        let mut sentiment_dict = HashMap::new();
        // Positive words
        sentiment_dict.insert("senang".to_string(), 2);
        sentiment_dict.insert("happy".to_string(), 2);
        sentiment_dict.insert("haha".to_string(), 1);
        sentiment_dict.insert("wkwk".to_string(), 1);
        sentiment_dict.insert("lucu".to_string(), 1);
        sentiment_dict.insert("mantap".to_string(), 2);
        sentiment_dict.insert("seru".to_string(), 1);
        sentiment_dict.insert("asik".to_string(), 1);
        sentiment_dict.insert("keren".to_string(), 1);
        sentiment_dict.insert("gokil".to_string(), 1);

        // Negative words
        sentiment_dict.insert("sedih".to_string(), -2);
        sentiment_dict.insert("galau".to_string(), -2);
        sentiment_dict.insert("stress".to_string(), -2);
        sentiment_dict.insert("capek".to_string(), -1);
        sentiment_dict.insert("lelah".to_string(), -1);
        sentiment_dict.insert("bingung".to_string(), -1);
        sentiment_dict.insert("takut".to_string(), -2);
        sentiment_dict.insert("khawatir".to_string(), -1);
        sentiment_dict.insert("down".to_string(), -2);
        sentiment_dict.insert("nangis".to_string(), -2);

        Self {
            reflective_keywords: vec![
                "sedih".to_string(),
                "galau".to_string(),
                "stress".to_string(),
                "capek".to_string(),
                "lelah".to_string(),
                "bingung".to_string(),
                "takut".to_string(),
                "khawatir".to_string(),
                "depresi".to_string(),
                "putus".to_string(),
                "gagal".to_string(),
                "susah".to_string(),
            ],
            playful_keywords: vec![
                "lucu".to_string(),
                "haha".to_string(),
                "wkwk".to_string(),
                "joke".to_string(),
                "bercanda".to_string(),
                "main".to_string(),
                "game".to_string(),
                "seru".to_string(),
                "asik".to_string(),
                "tebak".to_string(),
                "cerita".to_string(),
            ],
            mood_cache: HashMap::new(),
            mood_counts,
            sentiment_dict,
        }
    }

    /// Preprocess user input: sanitize, tokenize, count words
    #[wasm_bindgen]
    pub fn preprocess_input(&self, input: &str) -> JsValue {
        // Sanitize HTML/XSS
        let sanitized = input
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("&", "&amp;")
            .trim()
            .to_string();

        // Tokenize
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

    /// Calculate sentiment score from text
    #[wasm_bindgen]
    pub fn calculate_sentiment(&self, text: &str) -> i32 {
        let lower_text = text.to_lowercase();
        let words: Vec<&str> = lower_text.split_whitespace().collect();
        
        let mut score = 0;
        for word in words {
            if let Some(sentiment_value) = self.sentiment_dict.get(word) {
                score += sentiment_value;
            }
        }
        
        score
    }

    /// Detect mood with caching and sentiment analysis
    #[wasm_bindgen]
    pub fn detect_mood(&mut self, user_input: &str) -> String {
        let lower_input = user_input.to_lowercase();

        // Check cache first
        if let Some(cached_mood) = self.mood_cache.get(&lower_input) {
            return cached_mood.clone();
        }

        // Calculate sentiment score
        let sentiment_score = self.calculate_sentiment(&lower_input);

        // Determine mood based on sentiment and keywords
        let mood = if sentiment_score < -2 {
            "reflective"
        } else if sentiment_score > 2 {
            "playful"
        } else if self.reflective_keywords.iter().any(|kw| lower_input.contains(kw)) {
            "reflective"
        } else if self.playful_keywords.iter().any(|kw| lower_input.contains(kw)) {
            "playful"
        } else {
            "chill"
        }.to_string();

        // Update mood count
        *self.mood_counts.entry(mood.clone()).or_insert(0) += 1;

        // Cache result
        self.mood_cache.insert(lower_input, mood.clone());

        mood
    }

    /// Get dominant mood across session
    #[wasm_bindgen]
    pub fn get_dominant_mood(&self) -> String {
        self.mood_counts
            .iter()
            .max_by_key(|&(_, count)| count)
            .map(|(mood, _)| mood.clone())
            .unwrap_or_else(|| "chill".to_string())
    }

    /// Calculate mood transition based on sentiment
    #[wasm_bindgen]
    pub fn calculate_mood_transition(&self, current_mood: &str, sentiment_score: i32) -> String {
        match (current_mood, sentiment_score) {
            ("chill", s) if s < -3 => "reflective".to_string(),
            ("chill", s) if s > 3 => "playful".to_string(),
            ("playful", s) if s < -2 => "chill".to_string(),
            ("reflective", s) if s > 2 => "chill".to_string(),
            _ => current_mood.to_string(),
        }
    }

    /// Humanize AI response (remove formal language)
    #[wasm_bindgen]
    pub fn humanize_response(&self, response: &str) -> String {
        let mut humanized = response.to_string();

        // Formal -> Casual replacements
        let replacements = [
            ("Saya memahami", "Aku ngerti"),
            ("Saya mengerti", "Iya paham"),
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

        // Trim to max 3 sentences
        let sentences: Vec<&str> = humanized
            .split(|c| c == '.' || c == '!' || c == '?')
            .filter(|s| !s.trim().is_empty())
            .collect();

        if sentences.len() > 3 {
            humanized = sentences[..3].join(". ") + ".";
        }

        // Add natural fillers (10% chance)
        if js_sys::Math::random() < 0.1 {
            let fillers = ["hmm... ", "eh iya, ", "btw, ", "oh iya, "];
            let idx = (js_sys::Math::random() * fillers.len() as f64) as usize;
            humanized = format!("{}{}", fillers[idx], humanized);
        }

        humanized.trim().to_string()
    }

    /// Detect expression from text for Live2D (with sentiment awareness)
    #[wasm_bindgen]
    pub fn detect_expression(&self, text: &str) -> String {
        let lower_text = text.to_lowercase();
        let sentiment_score = self.calculate_sentiment(&lower_text);

        // Use sentiment score for more accurate expression
        if sentiment_score >= 3 {
            return "happy".to_string();
        } else if sentiment_score <= -3 {
            return "sad".to_string();
        }

        // Fallback to keyword matching
        let happy_keywords = ["senang", "haha", "wkwk", "lucu", "mantap", "seru"];
        let sad_keywords = ["sedih", "galau", "down", "nangis"];
        let surprised_keywords = ["wow", "gila", "astaga", "serius", "beneran"];

        for keyword in &happy_keywords {
            if lower_text.contains(keyword) {
                return "happy".to_string();
            }
        }

        for keyword in &sad_keywords {
            if lower_text.contains(keyword) {
                return "sad".to_string();
            }
        }

        for keyword in &surprised_keywords {
            if lower_text.contains(keyword) {
                return "surprised".to_string();
            }
        }

        "default".to_string()
    }

    /// Build conversation context summary
    #[wasm_bindgen]
    pub fn build_conversation_context(&self, messages: Vec<String>) -> String {
        let mut context = String::new();
        for (i, msg) in messages.iter().enumerate() {
            let role = if i % 2 == 0 { "User" } else { "MIRA" };
            context.push_str(&format!("{}: {}\n", role, msg));
        }
        context
    }

    /// Extract key topics from messages
    #[wasm_bindgen]
    pub fn extract_topics(&self, messages: Vec<String>) -> Vec<String> {
        let text = messages.join(" ").to_lowercase();
        let words: Vec<&str> = text
            .split_whitespace()
            .filter(|w| w.len() > 3)
            .collect();

        // Simple frequency counting
        let mut word_freq: HashMap<String, usize> = HashMap::new();
        for word in words {
            *word_freq.entry(word.to_string()).or_insert(0) += 1;
        }

        // Get top 5 most frequent words
        let mut freq_vec: Vec<_> = word_freq.into_iter().collect();
        freq_vec.sort_by(|a, b| b.1.cmp(&a.1));
        
        freq_vec.into_iter()
            .take(5)
            .map(|(word, _)| word)
            .collect()
    }

    /// Generate mini-game riddle
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

    /// Get offline fallback response
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

    /// Interpolate between expressions for smooth transitions
    #[wasm_bindgen]
    pub fn interpolate_expression(&self, current: &str, target: &str, progress: f32) -> String {
        if progress < 0.5 {
            current.to_string()
        } else {
            target.to_string()
        }
    }
}

// Optional: Standalone functions
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