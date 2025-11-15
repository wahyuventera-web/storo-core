import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[generate-blog] Starting blog generation...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Topics untuk artikel blog
    const topics = [
      'Tips meningkatkan penjualan online untuk UMKM',
      'Strategi marketing digital untuk toko online',
      'Cara memaksimalkan integrasi Shopee untuk bisnis',
      'Panduan lengkap membuat toko online yang profesional',
      'Optimasi produk untuk meningkatkan konversi penjualan',
      'Manajemen inventory yang efektif untuk e-commerce',
      'Strategi pricing yang tepat untuk toko online',
      'Cara meningkatkan customer retention di e-commerce',
      'Tips fotografi produk untuk toko online',
      'Automasi bisnis online dengan tools yang tepat',
    ];

    const categories = [
      'Tutorial',
      'Tips Bisnis',
      'Digital Marketing',
      'E-commerce',
      'Teknologi',
    ];

    // Pilih topik random
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];

    console.log(`[generate-blog] Generating article about: ${topic}`);

    // Generate artikel menggunakan OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Kamu adalah content writer profesional untuk Storo.id, platform webstore builder untuk UMKM Indonesia. 
            Tulis artikel blog dalam Bahasa Indonesia yang:
            - Praktis dan actionable
            - SEO-friendly
            - Fokus pada pain points pemilik toko online
            - Tone: profesional tapi ramah
            - Minimal 800 kata
            - Format: Markdown dengan heading (##, ###), bullet points, dan bold text untuk emphasis
            
            Struktur artikel:
            1. Opening yang menarik (masalah yang dihadapi pembaca)
            2. Penjelasan masalah lebih dalam
            3. Solusi praktis (step-by-step jika relevan)
            4. Contoh implementasi
            5. Call-to-action ke Storo.id
            
            PENTING: Jangan gunakan # untuk title utama, hanya gunakan ## dan ### untuk sub-headings.`
          },
          {
            role: 'user',
            content: `Buatkan artikel blog dengan topik: "${topic}". 
            
            Format response sebagai JSON dengan struktur:
            {
              "title": "Judul artikel yang menarik (max 60 karakter)",
              "excerpt": "Ringkasan artikel 150-200 kata yang menarik pembaca untuk klik",
              "content": "Konten lengkap dalam Markdown (minimal 800 kata)",
              "tags": ["tag1", "tag2", "tag3"] (3-5 tags relevan)
            }
            
            Pastikan content menggunakan Markdown dengan ## untuk heading utama, ### untuk sub-heading, **bold** untuk emphasis, dan bullet points (-)`,
          }
        ],
        temperature: 0.8,
        max_tokens: 3000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('[generate-blog] OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0].message.content;
    
    console.log('[generate-blog] Article generated successfully');

    // Parse JSON response
    let articleData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      articleData = JSON.parse(cleanContent);
    } catch (e) {
      console.error('[generate-blog] Failed to parse JSON:', e);
      throw new Error('Failed to parse generated article');
    }

    // Generate slug dari title
    const slug = articleData.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Get image dari Unsplash
    let imageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800';
    try {
      const unsplashResponse = await fetch(
        `https://api.unsplash.com/photos/random?query=business,online-shopping,e-commerce&orientation=landscape`,
        {
          headers: {
            'Authorization': 'Client-ID gKYle3_eisaWLj_u3j8EVMM-T6fy5tQD0cWFpZJdPpg',
          },
        }
      );
      
      if (unsplashResponse.ok) {
        const unsplashData = await unsplashResponse.json();
        imageUrl = unsplashData.urls.regular;
        console.log('[generate-blog] Image fetched from Unsplash');
      }
    } catch (e) {
      console.error('[generate-blog] Unsplash API error, using default image:', e);
    }

    // Check if slug already exists
    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('slug', slug)
      .single();

    let finalSlug = slug;
    if (existingPost) {
      // Add timestamp to make it unique
      finalSlug = `${slug}-${Date.now()}`;
      console.log('[generate-blog] Slug exists, using:', finalSlug);
    }

    // Save to database
    const { data: newPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: articleData.title,
        slug: finalSlug,
        excerpt: articleData.excerpt,
        content: articleData.content,
        author: 'Tim Storo.id',
        category: category,
        image_url: imageUrl,
        tags: articleData.tags || [],
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-blog] Database insert error:', insertError);
      throw insertError;
    }

    console.log('[generate-blog] Article saved to database:', newPost.id);

    return new Response(
      JSON.stringify({
        success: true,
        post: newPost,
        message: 'Blog article generated and published successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[generate-blog] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
