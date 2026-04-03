-- VocabAI Database Schema

-- 単語帳
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
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
  user_id UUID REFERENCES auth.users,
  score INTEGER CHECK (score BETWEEN 1 AND 5) NOT NULL,
  mode TEXT CHECK (mode IN ('flashcard', 'quiz')) NOT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX idx_words_notebook_id ON words(notebook_id);
CREATE INDEX idx_word_learning_word_id ON word_learning(word_id);
CREATE INDEX idx_word_learning_next_review ON word_learning(next_review_at);
CREATE INDEX idx_review_logs_word_id ON review_logs(word_id);
CREATE INDEX idx_review_logs_user_id ON review_logs(user_id);

-- ============================
-- Row Level Security (RLS)
-- ============================

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

-- notebooks: ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notebooks"
  ON notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notebooks"
  ON notebooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- words: notebook所有者のみアクセス可能
CREATE POLICY "Users can view words in own notebooks"
  ON words FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = words.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert words in own notebooks"
  ON words FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = words.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update words in own notebooks"
  ON words FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = words.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete words in own notebooks"
  ON words FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = words.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- word_learning: 自分のnotebookの単語のみ
CREATE POLICY "Users can manage own learning data"
  ON word_learning FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM words
      JOIN notebooks ON notebooks.id = words.notebook_id
      WHERE words.id = word_learning.word_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- review_logs: 自分のログのみ
CREATE POLICY "Users can view own review logs"
  ON review_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review logs"
  ON review_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
