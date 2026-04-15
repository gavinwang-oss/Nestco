CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  description TEXT NOT NULL,
  max_price INTEGER,
  room_types TEXT[],
  gender_preference TEXT,
  furnished BOOLEAN,
  utilities_included BOOLEAN,
  available_from DATE,
  max_walk_minutes INTEGER,
  pets BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 days'),
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active requests" ON requests
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can create requests" ON requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests" ON requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own requests" ON requests
  FOR DELETE USING (auth.uid() = user_id);
