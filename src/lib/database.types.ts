export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: string
          status: string
          designation: string | null
          department: string | null
          phone: string | null
          location: string | null
          bio: string | null
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          avatar_url?: string | null
          role?: string
          status?: string
          designation?: string | null
          department?: string | null
          phone?: string | null
          location?: string | null
          bio?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string
          lead_id: string | null
          start_date: string | null
          deadline: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string
          lead_id?: string | null
          start_date?: string | null
          deadline?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'projects_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          sprint_id: string | null
          title: string
          description: string | null
          status: string
          priority: string
          assignee_ids: string[]
          reporter_id: string
          due_date: string | null
          labels: string[] | null
          story_points: number | null
          comment_count: number
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          sprint_id?: string | null
          title: string
          description?: string | null
          status?: string
          priority?: string
          assignee_ids?: string[]
          reporter_id: string
          due_date?: string | null
          labels?: string[] | null
          story_points?: number | null
          comment_count?: number
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
        Relationships: []
      }
      sprints: {
        Row: {
          id: string
          project_id: string
          name: string
          goal: string | null
          start_date: string
          end_date: string
          status: string
          created_at: string
          total_story_points: number | null
          completed_story_points: number | null
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          goal?: string | null
          start_date: string
          end_date: string
          status?: string
          created_at?: string
          total_story_points?: number | null
          completed_story_points?: number | null
        }
        Update: Partial<Database['public']['Tables']['sprints']['Insert']>
        Relationships: []
      }
      issues: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          title: string
          description: string | null
          type: string
          severity: string
          status: string
          reporter_id: string
          assignee_id: string | null
          steps_to_reproduce: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          title: string
          description?: string | null
          type?: string
          severity?: string
          status?: string
          reporter_id: string
          assignee_id?: string | null
          steps_to_reproduce?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['issues']['Insert']>
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          author_id: string
          content: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          author_id: string
          content: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['comments']['Insert']>
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          email: string
          role: string
          status: string
          invited_by: string
          message: string | null
          token: string
          sent_at: string
          expires_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          email: string
          role: string
          status?: string
          invited_by: string
          message?: string | null
          token?: string
          sent_at?: string
          expires_at?: string
          accepted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['invitations']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string | null
          type: string
          title: string
          message: string
          read: boolean
          entity_type: string | null
          entity_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id?: string | null
          type: string
          title: string
          message: string
          read?: boolean
          entity_type?: string | null
          entity_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }
      subtasks: {
        Row: {
          id: string
          task_id: string
          title: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          completed?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['subtasks']['Insert']>
        Relationships: []
      }
      attachments: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          uploaded_by: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['attachments']['Insert']>
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          entity_name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          entity_name: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>
        Relationships: []
      }
      project_members: {
        Row: {
          project_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['project_members']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      notify_project_stakeholders: {
        Args: {
          p_project_id: string
          p_type: string
          p_title: string
          p_message: string
          p_entity_type?: string | null
          p_entity_id?: string | null
          p_extra_user_ids?: string[] | null
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
  }
}
