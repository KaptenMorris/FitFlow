export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coach_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_profile: {
        Row: {
          age: number | null
          created_at: string
          experience_level: string | null
          gender: string | null
          injuries: Json | null
          notes: string | null
          preferences: Json | null
          training_goals: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          experience_level?: string | null
          gender?: string | null
          injuries?: Json | null
          notes?: string | null
          preferences?: Json | null
          training_goals?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          experience_level?: string | null
          gender?: string | null
          injuries?: Json | null
          notes?: string | null
          preferences?: Json | null
          training_goals?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diet_plans: {
        Row: {
          activity_level: string | null
          allergies: string[]
          birth_year: number | null
          cheat_days: string[]
          created_at: string
          current_weight_kg: number | null
          gender: string | null
          goals: string[]
          height_cm: number | null
          id: string
          include_protein_powder: boolean
          target_date: string | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          allergies?: string[]
          birth_year?: number | null
          cheat_days?: string[]
          created_at?: string
          current_weight_kg?: number | null
          gender?: string | null
          goals?: string[]
          height_cm?: number | null
          id?: string
          include_protein_powder?: boolean
          target_date?: string | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_level?: string | null
          allergies?: string[]
          birth_year?: number | null
          cheat_days?: string[]
          created_at?: string
          current_weight_kg?: number | null
          gender?: string | null
          goals?: string[]
          height_cm?: number | null
          id?: string
          include_protein_powder?: boolean
          target_date?: string | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          body_part: string | null
          category: string | null
          created_at: string
          equipment: string
          external_id: string | null
          gif_url: string | null
          id: string
          image_url: string | null
          instructions_en: string[] | null
          instructions_sv: string[] | null
          muscle_group: string
          name: string
          name_sv: string | null
          secondary_muscles: string[] | null
          sub_muscle: string | null
          target: string | null
        }
        Insert: {
          body_part?: string | null
          category?: string | null
          created_at?: string
          equipment: string
          external_id?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions_en?: string[] | null
          instructions_sv?: string[] | null
          muscle_group: string
          name: string
          name_sv?: string | null
          secondary_muscles?: string[] | null
          sub_muscle?: string | null
          target?: string | null
        }
        Update: {
          body_part?: string | null
          category?: string | null
          created_at?: string
          equipment?: string
          external_id?: string | null
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions_en?: string[] | null
          instructions_sv?: string[] | null
          muscle_group?: string
          name?: string
          name_sv?: string | null
          secondary_muscles?: string[] | null
          sub_muscle?: string | null
          target?: string | null
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          id: string
          kcal: number
          log_date: string
          meal_type: string
          name: string
          protein_g: number
          serving: string | null
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          kcal?: number
          log_date?: string
          meal_type: string
          name: string
          protein_g?: number
          serving?: string | null
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          kcal?: number
          log_date?: string
          meal_type?: string
          name?: string
          protein_g?: number
          serving?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      gyms: {
        Row: {
          chain: string | null
          city: string | null
          created_at: string
          equipment: string[]
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          chain?: string | null
          city?: string | null
          created_at?: string
          equipment?: string[]
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          chain?: string | null
          city?: string | null
          created_at?: string
          equipment?: string[]
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_logs: {
        Row: {
          active_kcal: number | null
          created_at: string
          id: string
          log_date: string
          resting_hr_bpm: number | null
          sleep_minutes: number | null
          source: string
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_kcal?: number | null
          created_at?: string
          id?: string
          log_date: string
          resting_hr_bpm?: number | null
          sleep_minutes?: number | null
          source?: string
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_kcal?: number | null
          created_at?: string
          id?: string
          log_date?: string
          resting_hr_bpm?: number | null
          sleep_minutes?: number | null
          source?: string
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_log_entries: {
        Row: {
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          id: string
          kcal: number | null
          logged_date: string
          meal_type: string
          protein_g: number | null
          recipe_id: string | null
          recipe_name: string
          servings: number
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          kcal?: number | null
          logged_date?: string
          meal_type: string
          protein_g?: number | null
          recipe_id?: string | null
          recipe_name: string
          servings?: number
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          kcal?: number | null
          logged_date?: string
          meal_type?: string
          protein_g?: number | null
          recipe_id?: string | null
          recipe_name?: string
          servings?: number
          user_id?: string
        }
        Relationships: []
      }
      mf_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          estimated_tdee: number
          id: string
          new_kcal_target: number
          previous_kcal_target: number
          reason: string | null
          trend_change_kg: number | null
          user_id: string
        }
        Insert: {
          checkin_date: string
          created_at?: string
          estimated_tdee: number
          id?: string
          new_kcal_target: number
          previous_kcal_target: number
          reason?: string | null
          trend_change_kg?: number | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          estimated_tdee?: number
          id?: string
          new_kcal_target?: number
          previous_kcal_target?: number
          reason?: string | null
          trend_change_kg?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mf_day_targets: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          id: string
          kcal_target: number
          label: string | null
          protein_g: number
          user_id: string
          weekday: number
        }
        Insert: {
          carbs_g: number
          created_at?: string
          fat_g: number
          id?: string
          kcal_target: number
          label?: string | null
          protein_g: number
          user_id: string
          weekday: number
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          kcal_target?: number
          label?: string | null
          protein_g?: number
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      mf_food_log: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          fiber_g: number | null
          food_id: string | null
          id: string
          is_quick_add: boolean
          kcal: number
          log_date: string
          meal: Database["public"]["Enums"]["mf_meal"]
          name_snapshot: string
          protein_g: number
          servings: number
          sugar_g: number | null
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_id?: string | null
          id?: string
          is_quick_add?: boolean
          kcal: number
          log_date: string
          meal?: Database["public"]["Enums"]["mf_meal"]
          name_snapshot: string
          protein_g?: number
          servings?: number
          sugar_g?: number | null
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_id?: string | null
          id?: string
          is_quick_add?: boolean
          kcal?: number
          log_date?: string
          meal?: Database["public"]["Enums"]["mf_meal"]
          name_snapshot?: string
          protein_g?: number
          servings?: number
          sugar_g?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mf_food_log_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "mf_foods"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_foods: {
        Row: {
          brand: string | null
          calcium_mg: number | null
          carbs_g: number
          category: string | null
          created_at: string
          created_by: string | null
          fat_g: number
          fiber_g: number | null
          id: string
          iron_mg: number | null
          is_verified: boolean
          kcal: number
          name: string
          protein_g: number
          sat_fat_g: number | null
          serving_grams: number
          serving_label: string
          sodium_mg: number | null
          sugar_g: number | null
          vit_c_mg: number | null
          vit_d_ug: number | null
        }
        Insert: {
          brand?: string | null
          calcium_mg?: number | null
          carbs_g?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          iron_mg?: number | null
          is_verified?: boolean
          kcal: number
          name: string
          protein_g?: number
          sat_fat_g?: number | null
          serving_grams?: number
          serving_label?: string
          sodium_mg?: number | null
          sugar_g?: number | null
          vit_c_mg?: number | null
          vit_d_ug?: number | null
        }
        Update: {
          brand?: string | null
          calcium_mg?: number | null
          carbs_g?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          iron_mg?: number | null
          is_verified?: boolean
          kcal?: number
          name?: string
          protein_g?: number
          sat_fat_g?: number | null
          serving_grams?: number
          serving_label?: string
          sodium_mg?: number | null
          sugar_g?: number | null
          vit_c_mg?: number | null
          vit_d_ug?: number | null
        }
        Relationships: []
      }
      mf_nutrition_profile: {
        Row: {
          carbs_g: number
          created_at: string
          diet_style: Database["public"]["Enums"]["mf_diet_style"]
          expenditure_estimate: number | null
          fat_g: number
          goal: Database["public"]["Enums"]["mf_goal"]
          goal_rate_pct_per_week: number
          goal_weight_kg: number | null
          kcal_target: number
          last_checkin_at: string | null
          onboarded_at: string | null
          program_mode: Database["public"]["Enums"]["mf_program_mode"]
          protein_g: number
          starting_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          diet_style?: Database["public"]["Enums"]["mf_diet_style"]
          expenditure_estimate?: number | null
          fat_g?: number
          goal?: Database["public"]["Enums"]["mf_goal"]
          goal_rate_pct_per_week?: number
          goal_weight_kg?: number | null
          kcal_target?: number
          last_checkin_at?: string | null
          onboarded_at?: string | null
          program_mode?: Database["public"]["Enums"]["mf_program_mode"]
          protein_g?: number
          starting_weight_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          diet_style?: Database["public"]["Enums"]["mf_diet_style"]
          expenditure_estimate?: number | null
          fat_g?: number
          goal?: Database["public"]["Enums"]["mf_goal"]
          goal_rate_pct_per_week?: number
          goal_weight_kg?: number | null
          kcal_target?: number
          last_checkin_at?: string | null
          onboarded_at?: string | null
          program_mode?: Database["public"]["Enums"]["mf_program_mode"]
          protein_g?: number
          starting_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mf_recipe_items: {
        Row: {
          carbs_g: number
          fat_g: number
          food_id: string | null
          id: string
          kcal: number
          name_snapshot: string
          protein_g: number
          recipe_id: string
          servings: number
        }
        Insert: {
          carbs_g?: number
          fat_g?: number
          food_id?: string | null
          id?: string
          kcal: number
          name_snapshot: string
          protein_g?: number
          recipe_id: string
          servings?: number
        }
        Update: {
          carbs_g?: number
          fat_g?: number
          food_id?: string | null
          id?: string
          kcal?: number
          name_snapshot?: string
          protein_g?: number
          recipe_id?: string
          servings?: number
        }
        Relationships: [
          {
            foreignKeyName: "mf_recipe_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "mf_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mf_recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "mf_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_recipes: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          servings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          servings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          servings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mf_weight_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          source: string | null
          trend_kg: number | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          source?: string | null
          trend_kg?: number | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          source?: string | null
          trend_kg?: number | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      mood_logs: {
        Row: {
          created_at: string
          id: string
          logged_date: string
          mood: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_date?: string
          mood: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_date?: string
          mood?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_plans: {
        Row: {
          activity: string | null
          carbs_g: number
          created_at: string
          current_weight_kg: number | null
          fat_g: number
          gender: string | null
          goal: string
          height_cm: number | null
          id: string
          is_active: boolean
          kcal: number
          protein_g: number
          target_date: string | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity?: string | null
          carbs_g: number
          created_at?: string
          current_weight_kg?: number | null
          fat_g: number
          gender?: string | null
          goal: string
          height_cm?: number | null
          id?: string
          is_active?: boolean
          kcal: number
          protein_g: number
          target_date?: string | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string | null
          carbs_g?: number
          created_at?: string
          current_weight_kg?: number | null
          fat_g?: number
          gender?: string | null
          goal?: string
          height_cm?: number | null
          id?: string
          is_active?: boolean
          kcal?: number
          protein_g?: number
          target_date?: string | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          current_weight_kg: number | null
          display_name: string | null
          experience_level: string | null
          fitness_goal: string | null
          gender: string | null
          goal_weight_kg: number | null
          has_completed_onboarding: boolean
          height_cm: number | null
          id: string
          limitations: string | null
          motivation: string | null
          subscription_tier: string
          training_time: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          current_weight_kg?: number | null
          display_name?: string | null
          experience_level?: string | null
          fitness_goal?: string | null
          gender?: string | null
          goal_weight_kg?: number | null
          has_completed_onboarding?: boolean
          height_cm?: number | null
          id: string
          limitations?: string | null
          motivation?: string | null
          subscription_tier?: string
          training_time?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          current_weight_kg?: number | null
          display_name?: string | null
          experience_level?: string | null
          fitness_goal?: string | null
          gender?: string | null
          goal_weight_kg?: number | null
          has_completed_onboarding?: boolean
          height_cm?: number | null
          id?: string
          limitations?: string | null
          motivation?: string | null
          subscription_tier?: string
          training_time?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recipe_favorites: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_shares: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          recipe_id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          recipe_id: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          recipe_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_shares_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          carbs_g: number | null
          category: string | null
          checked_steps: Json
          cook_time_min: number | null
          created_at: string
          description: string | null
          fat_g: number | null
          id: string
          image_emoji: string | null
          image_path: string | null
          image_url: string | null
          in_meal_plan: boolean
          ingredients: Json
          instructions: string | null
          is_public: boolean
          kcal: number | null
          meal_type: string | null
          name: string
          portions: number
          protein_g: number | null
          protein_source: string | null
          protein_type: string | null
          steps: Json
          user_id: string | null
        }
        Insert: {
          carbs_g?: number | null
          category?: string | null
          checked_steps?: Json
          cook_time_min?: number | null
          created_at?: string
          description?: string | null
          fat_g?: number | null
          id?: string
          image_emoji?: string | null
          image_path?: string | null
          image_url?: string | null
          in_meal_plan?: boolean
          ingredients?: Json
          instructions?: string | null
          is_public?: boolean
          kcal?: number | null
          meal_type?: string | null
          name: string
          portions?: number
          protein_g?: number | null
          protein_source?: string | null
          protein_type?: string | null
          steps?: Json
          user_id?: string | null
        }
        Update: {
          carbs_g?: number | null
          category?: string | null
          checked_steps?: Json
          cook_time_min?: number | null
          created_at?: string
          description?: string | null
          fat_g?: number | null
          id?: string
          image_emoji?: string | null
          image_path?: string | null
          image_url?: string | null
          in_meal_plan?: boolean
          ingredients?: Json
          instructions?: string | null
          is_public?: boolean
          kcal?: number | null
          meal_type?: string | null
          name?: string
          portions?: number
          protein_g?: number | null
          protein_source?: string | null
          protein_type?: string | null
          steps?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_schemas: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          is_active: boolean | null
          is_done_today: boolean | null
          name: string
          progress_percent: number | null
          sessions_per_week: number | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          is_done_today?: boolean | null
          name: string
          progress_percent?: number | null
          sessions_per_week?: number | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          is_done_today?: boolean | null
          name?: string
          progress_percent?: number | null
          sessions_per_week?: number | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          ml: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          ml?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          ml?: number
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          id: string
          logged_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          id?: string
          logged_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          id?: string
          logged_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          calories: number | null
          completed_at: string
          day_index: number | null
          duration_min: number | null
          exercises_count: number
          id: string
          improved_count: number
          name: string
          schema_id: string | null
          user_id: string
          volume_kg: number | null
        }
        Insert: {
          calories?: number | null
          completed_at?: string
          day_index?: number | null
          duration_min?: number | null
          exercises_count?: number
          id?: string
          improved_count?: number
          name: string
          schema_id?: string | null
          user_id: string
          volume_kg?: number | null
        }
        Update: {
          calories?: number | null
          completed_at?: string
          day_index?: number | null
          duration_min?: number | null
          exercises_count?: number
          id?: string
          improved_count?: number
          name?: string
          schema_id?: string | null
          user_id?: string
          volume_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "training_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_set_logs: {
        Row: {
          completed: boolean
          created_at: string
          exercise_id: string | null
          exercise_name: string | null
          id: string
          reps: number | null
          session_id: string
          set_number: number
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string | null
          id?: string
          reps?: number | null
          session_id: string
          set_number: number
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string | null
          id?: string
          reps?: number | null
          session_id?: string
          set_number?: number
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_profiles: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_public_profiles: {
        Args: { _q: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      mf_diet_style: "balanced" | "low_carb" | "keto" | "high_carb"
      mf_goal: "cut" | "maintain" | "bulk"
      mf_meal: "breakfast" | "lunch" | "dinner" | "snack"
      mf_program_mode: "coached" | "collaborative" | "manual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      mf_diet_style: ["balanced", "low_carb", "keto", "high_carb"],
      mf_goal: ["cut", "maintain", "bulk"],
      mf_meal: ["breakfast", "lunch", "dinner", "snack"],
      mf_program_mode: ["coached", "collaborative", "manual"],
    },
  },
} as const
