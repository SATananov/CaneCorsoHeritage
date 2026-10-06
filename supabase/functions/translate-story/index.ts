import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_LANGUAGES = new Set(['en', 'bg', 'it']);
const DEEPL_LANGUAGES: Record<string, string> = {
    en: 'EN',
    bg: 'BG',
    it: 'IT',
};

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    });
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, 405);
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const deeplApiKey = Deno.env.get('DEEPL_API_KEY');
        const deeplApiUrl = Deno.env.get('DEEPL_API_URL') ?? 'https://api-free.deepl.com/v2/translate';

        if (!supabaseUrl || !anonKey || !serviceRoleKey || !deeplApiKey) {
            return json({ error: 'Translation service is not configured.' }, 500);
        }

        const authorization = request.headers.get('Authorization');
        let authenticatedUserId: string | null = null;

        if (authorization) {
            const userClient = createClient(supabaseUrl, anonKey, {
                global: {
                    headers: { Authorization: authorization },
                },
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            });

            const { data: userData } = await userClient.auth.getUser();
            authenticatedUserId = userData.user?.id ?? null;
        }

        const { storyId, targetLanguage } = await request.json();

        if (!storyId || !SUPPORTED_LANGUAGES.has(targetLanguage)) {
            return json({ error: 'Invalid story or target language.' }, 400);
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const { data: story, error: storyError } = await admin
            .from('stories')
            .select('id, author_id, status, visibility, moderation_status, original_language, title, description, content, created_at, updated_at')
            .eq('id', storyId)
            .maybeSingle();

        if (storyError || !story) {
            return json({ error: 'Story not found.' }, 404);
        }

        const isPublic = story.status === 'published'
            && story.visibility === 'community'
            && story.moderation_status === 'approved';
        const isOwner = authenticatedUserId && story.author_id === authenticatedUserId;

        if (!isPublic && !isOwner) {
            return json({
                error: authenticatedUserId
                    ? 'Story is not available to this account.'
                    : 'Authentication required for this Story.',
            }, authenticatedUserId ? 403 : 401);
        }

        const sourceLanguage = story.original_language || 'en';

        if (sourceLanguage === targetLanguage) {
            return json({
                translation: {
                    story_id: story.id,
                    language: targetLanguage,
                    title: story.title,
                    description: story.description,
                    content: story.content,
                    source_updated_at: story.updated_at ?? story.created_at,
                    provider: 'original',
                },
            });
        }

        const sourceUpdatedAt = story.updated_at ?? story.created_at;

        const { data: cached } = await admin
            .from('story_translations')
            .select('story_id, language, title, description, content, source_updated_at, provider, created_at, updated_at')
            .eq('story_id', story.id)
            .eq('language', targetLanguage)
            .maybeSingle();

        if (
            cached
            && new Date(cached.source_updated_at).getTime() === new Date(sourceUpdatedAt).getTime()
        ) {
            return json({ translation: cached, cached: true });
        }

        const body: Record<string, unknown> = {
            text: [story.title, story.description, story.content],
            target_lang: DEEPL_LANGUAGES[targetLanguage],
            preserve_formatting: true,
        };

        if (DEEPL_LANGUAGES[sourceLanguage]) {
            body.source_lang = DEEPL_LANGUAGES[sourceLanguage];
        }

        const deeplResponse = await fetch(deeplApiUrl, {
            method: 'POST',
            headers: {
                Authorization: `DeepL-Auth-Key ${deeplApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!deeplResponse.ok) {
            const providerMessage = await deeplResponse.text();
            console.error('DeepL translation failed:', deeplResponse.status, providerMessage);
            return json({ error: 'Translation provider failed.' }, 502);
        }

        const providerData = await deeplResponse.json();
        const translations = providerData?.translations;

        if (!Array.isArray(translations) || translations.length !== 3) {
            return json({ error: 'Translation provider returned an invalid response.' }, 502);
        }

        const translatedRow = {
            story_id: story.id,
            language: targetLanguage,
            title: translations[0].text,
            description: translations[1].text,
            content: translations[2].text,
            source_updated_at: sourceUpdatedAt,
            provider: 'deepl',
            updated_at: new Date().toISOString(),
        };

        const { data: saved, error: saveError } = await admin
            .from('story_translations')
            .upsert(translatedRow, { onConflict: 'story_id,language' })
            .select('story_id, language, title, description, content, source_updated_at, provider, created_at, updated_at')
            .single();

        if (saveError) {
            console.error('Unable to cache story translation:', saveError);
            return json({ error: 'Unable to save translation.' }, 500);
        }

        return json({ translation: saved, cached: false });
    } catch (error) {
        console.error('translate-story error:', error);
        return json({ error: 'Unexpected translation error.' }, 500);
    }
});
