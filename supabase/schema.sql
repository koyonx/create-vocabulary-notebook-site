-- VocabAI Database Schema

-- 単語帳
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 単語
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks ON DELETE CASCADE NOT NULL,
  term TEXT NOT NULL,
  meaning TEXT NOT NULL,
  part_of_speech TEXT DEFAULT '',
  example_sentence TEXT DEFAULT '',
  context TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 学習データ（SM-2）
CREATE TABLE word_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID REFERENCES words ON DELETE CASCADE NOT NULL UNIQUE,
  ease_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  repetition INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  next_review_at TIMESTAMPTZ DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ
);

-- 復習ログ（分析用）
CREATE TABLE review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID REFERENCES words ON DELETE CASCADE NOT NULL,
  score INTEGER CHECK (score BETWEEN 1 AND 5) NOT NULL,
  mode TEXT CHECK (mode IN ('flashcard', 'quiz')) NOT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_words_notebook_id ON words(notebook_id);
CREATE INDEX idx_word_learning_word_id ON word_learning(word_id);
CREATE INDEX idx_word_learning_next_review ON word_learning(next_review_at);
CREATE INDEX idx_review_logs_word_id ON review_logs(word_id);
