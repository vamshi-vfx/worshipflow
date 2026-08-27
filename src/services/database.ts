import { supabase } from "@/lib/supabase";
import type { Song, SongSection, LyricLine, Service, ServiceItem, Theme, Announcement, BiblePresentation, Media } from "@/types";

export const db = {
  // Songs
  async getSongs(userId?: string) {
    let query = supabase
      .from("songs")
      .select("*")
      .order("updated_at", { ascending: false });

    if (userId) {
      query = query.or(`created_by.eq.${userId},created_by.is.null`);
    }

    const { data, error } = await query;
    console.log("[WF DEBUG] SONG LIST USER:", userId);
    console.log("[WF DEBUG] SONG LIST DATA:", data);
    console.log("[WF DEBUG] SONG LIST ERROR:", error);
    if (error) {
      console.error("db.getSongs error:", error.message);
      return [];
    }
    return (data || []).map(formatSongDbToModel);
  },

  async getSong(id: string, userId?: string) {
    let query = supabase
      .from("songs")
      .select("*")
      .eq("id", id);

    if (userId) {
      query = query.or(`created_by.eq.${userId},created_by.is.null`);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("db.getSong error:", error.message);
      return null;
    }
    return data ? formatSongDbToModel(data) : null;
  },

  async getSongWithSections(id: string, userId?: string) {
    const song = await this.getSong(id, userId);
    if (!song) return null;

    const sections = await this.getSongSections(id);
    const sectionsWithLines = await Promise.all(
      sections.map(async (section) => {
        const lines = await this.getSongLines(section.id);
        return {
          ...section,
          lines: lines.map((line) => ({
            id: line.id,
            order: line.order,
            primaryText: line.primary_text,
            secondaryText: line.secondary_text || "",
            chords: line.chords || "",
            language: line.language,
            displayMode: line.display_mode,
          })),
        };
      })
    );

    return { ...song, sections: sectionsWithLines } as Song;
  },

  async createSong(song: Record<string, unknown>, userId: string) {
    const dbPayload = formatSongModelToDb(song, userId);
    console.log("[WF DEBUG] INSERT PAYLOAD:", dbPayload);
    const { data, error } = await supabase
      .from("songs")
      .insert([dbPayload])
      .select()
      .single();

    console.log("[WF DEBUG] INSERT DATA:", data);
    console.log("[WF DEBUG] INSERT ERROR:", error);

    if (error) throw error;
    return formatSongDbToModel(data);
  },

  async updateSong(id: string, updates: Record<string, unknown>, userId: string) {
    const dbPayload = formatSongModelToDb(updates);
    const { data, error } = await supabase
      .from("songs")
      .update({ ...dbPayload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return formatSongDbToModel(data);
  },

  async deleteSong(id: string, userId: string) {
    const { error } = await supabase
      .from("songs")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async toggleFavorite(id: string, favorite: boolean, userId: string) {
    return this.updateSong(id, { favorite }, userId);
  },

  // Song Sections & Lines
  async getSongSections(songId: string) {
    const { data, error } = await supabase
      .from("song_sections")
      .select("*")
      .eq("song_id", songId)
      .order("order", { ascending: true });

    if (error) {
      console.error("db.getSongSections error:", error.message);
      return [];
    }
    return data || [];
  },

  async createSongSections(sections: Record<string, unknown>[]) {
    const { data, error } = await supabase
      .from("song_sections")
      .insert(sections)
      .select();

    if (error) throw error;
    return data || [];
  },

  async createSongSection(section: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("song_sections")
      .insert([section])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSongSection(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("song_sections")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSongSection(id: string) {
    const { error } = await supabase
      .from("song_sections")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async deleteSongSections(songId: string) {
    const { error } = await supabase
      .from("song_sections")
      .delete()
      .eq("song_id", songId);

    if (error) throw error;
  },

  async getSongLines(sectionId: string) {
    const { data, error } = await supabase
      .from("song_lines")
      .select("*")
      .eq("section_id", sectionId)
      .order("order", { ascending: true });

    if (error) {
      console.error("db.getSongLines error:", error.message);
      return [];
    }
    return data || [];
  },

  async createSongLines(lines: Record<string, unknown>[]) {
    const { error } = await supabase
      .from("song_lines")
      .insert(lines);

    if (error) throw error;
  },

  async createSongLine(line: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("song_lines")
      .insert([line])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSongLine(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("song_lines")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSongLine(id: string) {
    const { error } = await supabase
      .from("song_lines")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async getSongSlides(songId: string) {
    const { data, error } = await supabase
      .from("song_slides")
      .select("*")
      .eq("song_id", songId)
      .order("section_order", { ascending: true })
      .order("order", { ascending: true });

    if (error) {
      console.error("db.getSongSlides error:", error.message);
      return [];
    }
    return data || [];
  },

  async createSongSlides(slides: Record<string, unknown>[]) {
    const { error } = await supabase
      .from("song_slides")
      .insert(slides);

    if (error) throw error;
  },

  async createSongSlide(slide: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("song_slides")
      .insert([slide])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSongSlide(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("song_slides")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSongSlide(id: string) {
    const { error } = await supabase
      .from("song_slides")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Services
  async getServices(userId: string) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("created_by", userId)
      .order("date", { ascending: false });

    if (error) {
      console.error("db.getServices error:", error.message);
      return [];
    }
    return data || [];
  },

  async getService(id: string, userId: string) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async createService(service: Record<string, unknown>, userId: string) {
    const { data, error } = await supabase
      .from("services")
      .insert([{ ...service, created_by: userId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateService(id: string, updates: Record<string, unknown>, userId: string) {
    const { data, error } = await supabase
      .from("services")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteService(id: string, userId: string) {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async getServiceItems(serviceId: string) {
    const { data, error } = await supabase
      .from("service_items")
      .select("*")
      .eq("service_id", serviceId)
      .order("order", { ascending: true });

    if (error) {
      console.error("db.getServiceItems error:", error.message);
      return [];
    }
    return (data || []).map((item) => ({
      id: item.id,
      serviceId: item.service_id,
      type: item.type,
      songId: item.song_id,
      bibleReference: item.bible_reference,
      bibleText: item.bible_text,
      announcementId: item.announcement_id,
      order: item.order,
      notes: item.notes,
    }));
  },

  async createServiceItems(items: Record<string, unknown>[]) {
    const dbPayload = items.map((item) => ({
      service_id: item.service_id || item.serviceId,
      type: item.type,
      song_id: item.song_id || item.songId || null,
      bible_reference: item.bible_reference || item.bibleReference || null,
      bible_text: item.bible_text || item.bibleText || null,
      announcement_id: item.announcement_id || item.announcementId || null,
      order: item.order ?? 0,
      notes: item.notes || null,
    }));

    const { error } = await supabase
      .from("service_items")
      .insert(dbPayload);

    if (error) throw error;
  },

  async deleteServiceItems(target: string | string[]) {
    if (Array.isArray(target)) {
      const { error } = await supabase
        .from("service_items")
        .delete()
        .in("id", target);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("service_items")
        .delete()
        .eq("service_id", target);
      if (error) throw error;
    }
  },

  // Bible Presentations
  async getBiblePresentations(userId: string) {
    const { data, error } = await supabase
      .from("bible_presentations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("db.getBiblePresentations error:", error.message);
      return [];
    }
    return (data || []).map((p) => ({
      id: p.id,
      book: p.book,
      chapter: p.chapter,
      verseStart: p.verse_start,
      verseEnd: p.verse_end,
      translation: p.translation,
      text: p.text,
      teluguText: p.telugu_text,
      createdAt: p.created_at,
    }));
  },

  async createBiblePresentation(presentation: Record<string, unknown>, userId: string) {
    const { data, error } = await supabase
      .from("bible_presentations")
      .insert([{
        book: presentation.book,
        chapter: presentation.chapter,
        verse_start: presentation.verseStart || presentation.verse_start,
        verse_end: presentation.verseEnd || presentation.verse_end,
        translation: presentation.translation || "ESV",
        text: presentation.text,
        created_by: userId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteBiblePresentation(id: string, userId: string) {
    const { error } = await supabase
      .from("bible_presentations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Announcements
  async getAnnouncements(userId: string) {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("db.getAnnouncements error:", error.message);
      return [];
    }
    return (data || []).map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      date: a.date,
      time: a.time,
      location: a.location,
      imageUrl: a.image_url,
      createdAt: a.created_at,
    }));
  },

  async createAnnouncement(announcement: Record<string, unknown>, userId: string) {
    const { data, error } = await supabase
      .from("announcements")
      .insert([{
        title: announcement.title,
        description: announcement.description || null,
        date: announcement.date || null,
        time: announcement.time || null,
        location: announcement.location || null,
        image_url: announcement.imageUrl || announcement.image_url || null,
        created_by: userId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAnnouncement(id: string, userId: string) {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Themes
  async getThemes(userId?: string) {
    let query = supabase
      .from("themes")
      .select("*")
      .order("is_default", { ascending: false });

    if (userId) {
      query = query.or(`is_default.eq.true,created_by.eq.${userId}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("db.getThemes error:", error.message);
      return [];
    }
    return (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      background: t.background,
      font: t.font,
      alignment: t.alignment,
      verticalAlign: t.vertical_align,
      letterSpacing: t.letter_spacing,
      lineSpacing: t.line_spacing,
      shadow: t.shadow,
      overlay: t.overlay,
      logo: t.logo,
      isDefault: t.is_default,
    }));
  },

  async createTheme(theme: Record<string, unknown>, userId: string) {
    const { data, error } = await supabase
      .from("themes")
      .insert([{
        name: theme.name,
        description: theme.description || null,
        background: theme.background,
        font: theme.font,
        alignment: theme.alignment || "center",
        vertical_align: theme.verticalAlign || theme.vertical_align || "center",
        letter_spacing: theme.letterSpacing || theme.letter_spacing || 0,
        line_spacing: theme.lineSpacing || theme.line_spacing || 1.5,
        shadow: theme.shadow ?? true,
        overlay: theme.overlay || null,
        logo: theme.logo || null,
        is_default: false,
        created_by: userId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Media
  async getMedia(userId: string) {
    const { data, error } = await supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("db.getMedia error:", error.message);
      return [];
    }
    return (data || []).map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnail_url,
      size: m.size,
      createdAt: m.created_at,
    }));
  },

  async createMedia(media: Record<string, unknown>, userId: string) {
    const { data, error } = await supabase
      .from("media")
      .insert([{
        name: media.name,
        type: media.type,
        url: media.url,
        thumbnail_url: media.thumbnailUrl || media.thumbnail_url || null,
        size: media.size || null,
        created_by: userId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMedia(id: string, userId: string) {
    const { error } = await supabase
      .from("media")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Import Tracking
  async createImportJob(payload: { filename?: string; format: string; totalCount: number; createdBy: string }) {
    const { data, error } = await supabase
      .from("import_jobs")
      .insert({
        filename: payload.filename,
        format: payload.format,
        total_count: payload.totalCount,
        imported_count: 0,
        skipped_count: 0,
        failed_count: 0,
        status: "processing",
        created_by: payload.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateImportJob(id: string, updates: { importedCount?: number; skippedCount?: number; failedCount?: number; status?: string }) {
    const dbUpdates: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.importedCount !== undefined) dbUpdates.imported_count = updates.importedCount;
    if (updates.skippedCount !== undefined) dbUpdates.skipped_count = updates.skippedCount;
    if (updates.failedCount !== undefined) dbUpdates.failed_count = updates.failedCount;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { data, error } = await supabase
      .from("import_jobs")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createImportItem(payload: {
    importJobId: string;
    title: string;
    language: string;
    status?: string;
    errorMessage?: string;
    duplicateOfId?: string;
    duplicateScore?: number;
    resolution?: string;
    sourceName?: string;
    sourceUrl?: string;
    license?: string;
    copyrightNotice?: string;
    contentOwner?: string;
    songId?: string;
    sourceType?: string;
    sourceFileName?: string;
    sourceFileHash?: string;
    pageStart?: number;
    pageEnd?: number;
  }) {
    const { data, error } = await supabase
      .from("import_items")
      .insert({
        import_job_id: payload.importJobId,
        title: payload.title,
        language: payload.language,
        status: payload.status || "pending",
        error_message: payload.errorMessage,
        duplicate_of_id: payload.duplicateOfId,
        duplicate_score: payload.duplicateScore,
        resolution: payload.resolution,
        source_name: payload.sourceName,
        source_url: payload.sourceUrl,
        license: payload.license,
        copyright_notice: payload.copyrightNotice,
        content_owner: payload.contentOwner,
        source_type: payload.sourceType,
        source_file_name: payload.sourceFileName,
        source_file_hash: payload.sourceFileHash,
        page_start: payload.pageStart,
        page_end: payload.pageEnd,
        song_id: payload.songId,
        imported_at: payload.status === "imported" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getImportJobs(userId: string) {
    const { data, error } = await supabase
      .from("import_jobs")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("db.getImportJobs error:", error.message);
      return [];
    }
    return data || [];
  },

  async getImportItems(jobId: string) {
    const { data, error } = await supabase
      .from("import_items")
      .select("*")
      .eq("import_job_id", jobId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("db.getImportItems error:", error.message);
      return [];
    }
    return data || [];
  },

  async rollbackImportJob(jobId: string) {
    const items = await this.getImportItems(jobId);
    const songIds = items
      .filter((item: any) => item.song_id && item.status === "imported")
      .map((item: any) => item.song_id);

    if (songIds.length === 0) return { deleted: 0 };

    const { error } = await supabase
      .from("songs")
      .delete()
      .in("id", songIds);

    if (error) throw error;

    await supabase
      .from("import_jobs")
      .update({ status: "rolled_back", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return { deleted: songIds.length };
  },

  async retryFailedImportItems(jobId: string, userId: string) {
    const items = await this.getImportItems(jobId);
    const failed = items.filter((item: any) => item.status === "failed" || item.status === "needs_review");

    const results = {
      retried: failed.length,
      imported: 0,
      failed: 0 as number,
    };

    for (const item of failed) {
      try {
        const payload = {
          title: item.title,
          language: item.language,
          category: "worship",
          lyrics: "",
          sourceName: item.source_name,
          sourceUrl: item.source_url,
          license: item.license,
          copyrightNotice: item.copyright_notice,
          contentOwner: item.content_owner,
          favorite: false,
        };

        const created = await this.createSong(payload, userId);

        await supabase
          .from("import_items")
          .update({
            status: "imported",
            song_id: created?.id,
            imported_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", item.id);

        results.imported++;
      } catch (err) {
        console.error("Retry import item failed", err);
        results.failed++;
      }
    }

    await this.updateImportJob(jobId, {
      importedCount: results.imported,
      failedCount: results.failed,
      status: results.failed === 0 ? "completed" : "partial",
    });

    return results;
  },

  async createContentSource(payload: {
    name: string;
    url?: string;
    apiUrl?: string;
    license: string;
    contentOwner?: string;
    status?: string;
    syncFrequency?: string;
    createdBy: string;
  }) {
    const { data, error } = await supabase
      .from("content_sources")
      .insert({
        name: payload.name,
        url: payload.url,
        api_url: payload.apiUrl,
        license: payload.license,
        content_owner: payload.contentOwner,
        status: payload.status || "active",
        sync_frequency: payload.syncFrequency || "manual",
        created_by: payload.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getContentSources() {
    const { data, error } = await supabase
      .from("content_sources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("db.getContentSources error:", error.message);
      return [];
    }
    return data || [];
  },
};

// Helper: Format DB row to TypeScript Song interface
function formatSongDbToModel(row: any): Song {
  return {
    id: row.id,
    title: row.title,
    romanizedTitle: row.romanized_title || "",
    englishTitle: row.english_title || "",
    slug: row.slug || row.id,
    language: row.language,
    secondaryLanguage: row.secondary_language,
    category: row.category || "worship",
    author: row.author || "",
    artist: row.artist || row.author || "",
    composer: row.composer || "",
    lyricist: row.lyricist || "",
    translator: row.translator || "",
    key: row.key || "",
    tempo: row.tempo,
    source: row.source || "",
    sourceName: row.source_name || row.source || "",
    sourceUrl: row.source_url || "",
    sourceType: row.source_type || "",
    sourceFileName: row.source_file_name || "",
    sourceFileHash: row.source_file_hash || "",
    pageStart: row.page_start,
    pageEnd: row.page_end,
    license: row.license || "",
    copyright: row.copyright || "",
    copyrightYear: row.copyright_year,
    copyrightNotice: row.copyright_notice || row.copyright || "",
    contentOwner: row.content_owner || "",
    lyrics: row.lyrics || "",
    chords: row.chords || "",
    sections: row.sections || [],
    tags: row.tags || [],
    audioUrl: row.audio_url || "",
    thumbnailUrl: row.thumbnail_url || "",
    favorite: row.favorite ?? false,
    usageCount: row.usage_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper: Format TypeScript Song payload to DB column names
function formatSongModelToDb(model: any, userId?: string): any {
  const db: any = {};
  if (userId) db.created_by = userId;
  if (model.title !== undefined) db.title = model.title;
  if (model.romanizedTitle !== undefined || model.romanized_title !== undefined) {
    db.romanized_title = model.romanizedTitle ?? model.romanized_title;
  }
  if (model.englishTitle !== undefined || model.english_title !== undefined) {
    db.english_title = model.englishTitle ?? model.english_title;
  }
  if (model.slug !== undefined) db.slug = model.slug;
  if (model.language !== undefined) db.language = model.language;
  if (model.secondaryLanguage !== undefined || model.secondary_language !== undefined) {
    db.secondary_language = model.secondaryLanguage ?? model.secondary_language;
  }
  if (model.category !== undefined) db.category = model.category;
  if (model.author !== undefined) db.author = model.author;
  if (model.artist !== undefined) db.artist = model.artist;
  if (model.composer !== undefined) db.composer = model.composer;
  if (model.lyricist !== undefined) db.lyricist = model.lyricist;
  if (model.translator !== undefined) db.translator = model.translator;
  if (model.key !== undefined) db.key = model.key;
  if (model.tempo !== undefined) db.tempo = model.tempo;
  if (model.source !== undefined) db.source = model.source;
  if (model.sourceName !== undefined || model.source_name !== undefined) {
    db.source_name = model.sourceName ?? model.source_name;
  }
  if (model.sourceUrl !== undefined || model.source_url !== undefined) {
    db.source_url = model.sourceUrl ?? model.source_url;
  }
  if (model.sourceType !== undefined || model.source_type !== undefined) {
    db.source_type = model.sourceType ?? model.source_type;
  }
  if (model.sourceFileName !== undefined || model.source_file_name !== undefined) {
    db.source_file_name = model.sourceFileName ?? model.source_file_name;
  }
  if (model.sourceFileHash !== undefined || model.source_file_hash !== undefined) {
    db.source_file_hash = model.sourceFileHash ?? model.source_file_hash;
  }
  if (model.pageStart !== undefined || model.page_start !== undefined) {
    db.page_start = model.pageStart ?? model.page_start;
  }
  if (model.pageEnd !== undefined || model.page_end !== undefined) {
    db.page_end = model.pageEnd ?? model.page_end;
  }
  if (model.license !== undefined) db.license = model.license;
  if (model.copyright !== undefined) db.copyright = model.copyright;
  if (model.copyrightYear !== undefined || model.copyright_year !== undefined) {
    db.copyright_year = model.copyrightYear ?? model.copyright_year;
  }
  if (model.copyrightNotice !== undefined || model.copyright_notice !== undefined) {
    db.copyright_notice = model.copyrightNotice ?? model.copyright_notice;
  }
  if (model.lyrics !== undefined) db.lyrics = model.lyrics;
  if (model.chords !== undefined) db.chords = model.chords;
  if (model.tags !== undefined) db.tags = model.tags;
  if (model.audioUrl !== undefined || model.audio_url !== undefined) {
    db.audio_url = model.audioUrl ?? model.audio_url;
  }
  if (model.thumbnailUrl !== undefined || model.thumbnail_url !== undefined) {
    db.thumbnail_url = model.thumbnailUrl ?? model.thumbnail_url;
  }
  if (model.favorite !== undefined) db.favorite = model.favorite;
  if (model.usageCount !== undefined || model.usage_count !== undefined) {
    db.usage_count = model.usageCount ?? model.usage_count;
  }
  return db;
}
