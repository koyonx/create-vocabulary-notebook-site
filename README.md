# VocabAI - AI単語帳作成

画像・動画・PDF・音声ファイルをアップロードするだけで、AIが自動で単語帳を作成するWebアプリ。SM-2アルゴリズムによる間隔反復学習で効率的に暗記できます。

## 機能

- **AI単語抽出**: 画像/動画/PDF/音声からGeminiが自動で単語を抽出
- **手動追加・編集**: 単語の手動追加、インライン編集
- **AI改善**: 各単語をワンクリックでAIが意味・例文・品詞を改善
- **スマートマージ**: AI追加時に既存単語と重複検知し、不足情報を自動補完
- **フラッシュカード**: SM-2間隔反復アルゴリズムで最適なタイミングで出題
- **4択クイズ**: Geminiが苦手単語を重点的に出題するクイズモード
- **学習統計**: 習得率・正答率・苦手単語ランキングをダッシュボード表示
- **ユーザー認証**: Supabase Authによるアカウント管理、RLSでデータ保護

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) + TypeScript |
| スタイル | Tailwind CSS |
| AI | Google Gemini API |
| DB / Auth | Supabase (PostgreSQL + Auth + RLS) |
| デプロイ | Vercel |

## セットアップ

### 必須要件

- Node.js 20+
- Gemini APIキー ([Google AI Studio](https://aistudio.google.com/apikey) で取得)

### インストール

```bash
npm install
cp .env.sample .env.local
```

### 環境変数 (.env.local)

```env
# 必須
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash  # または gemini-2.5-pro (要課金)

# Supabase (任意 - 未設定時はlocalStorageで動作)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabaseセットアップ (任意)

1. [Supabase](https://supabase.com) でプロジェクト作成
2. SQL Editor で `supabase/schema.sql` を実行
3. `.env.local` にURL・キーを設定

### 起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

### Vercelデプロイ

```bash
vercel --prod
```

環境変数は `vercel env add` で設定してください。

## プロジェクト構成

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/     # Gemini解析API
│   │   ├── improve/     # AI単語改善API
│   │   └── quiz/        # AIクイズ生成API
│   ├── auth/            # ログイン/サインアップ
│   ├── notebooks/
│   │   ├── [id]/
│   │   │   ├── study/   # 学習モード(フラッシュカード/クイズ)
│   │   │   └── page.tsx # 単語帳詳細 + 編集 + 統計
│   │   └── page.tsx     # 単語帳一覧
│   └── page.tsx         # トップ(アップロード)
├── components/
│   ├── AuthGuard.tsx     # 認証ガード
│   ├── AuthHeader.tsx    # ヘッダー(認証状態表示)
│   ├── FileUploader.tsx  # ドラッグ&ドロップアップローダー
│   ├── FlashCard.tsx     # フラッシュカード(キーボード対応)
│   ├── QuizMode.tsx      # 4択クイズ
│   ├── WordCard.tsx      # 単語カード(編集/AI改善/削除)
│   └── WordEditor.tsx    # 単語追加・編集フォーム
└── lib/
    ├── auth-context.tsx  # 認証コンテキスト
    ├── gemini.ts         # Gemini APIクライアント
    ├── sm2.ts            # SM-2間隔反復アルゴリズム
    ├── stats.ts          # 学習統計計算
    ├── storage.ts        # DB層(Supabase/localStorage)
    └── types.ts          # 型定義
```

## 学習アルゴリズム

SM-2ベースの間隔反復システム:

- 5段階評価 (忘れた / あと少し / ギリギリ / 正解 / 余裕)
- easeFactor, interval, repetition, lapses で記憶度を管理
- 苦手度・期限超過・忘却回数で出題優先度を計算
- 1単語あたり最大3回まで再出題 (無限ループ防止)

## ライセンス

MIT
