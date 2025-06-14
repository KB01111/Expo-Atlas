import { supabaseService } from './supabase';
import { realtimeChatService } from './realtimeChat';

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Team settings
  settings: {
    visibility: 'public' | 'private' | 'invite_only';
    allow_member_invites: boolean;
    auto_approve_requests: boolean;
    max_members: number;
    default_role: TeamRole;
  };
  
  // Statistics
  stats: {
    member_count: number;
    agent_count: number;
    workflow_count: number;
    execution_count: number;
    total_cost: number;
  };
  
  // Billing and limits
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    limits: {
      max_agents: number;
      max_workflows: number;
      max_executions_per_month: number;
      max_cost_per_month: number;
    };
    usage: {
      agents_used: number;
      workflows_used: number;
      executions_this_month: number;
      cost_this_month: number;
    };
  };
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  status: 'active' | 'invited' | 'suspended';
  
  // User information
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    last_active: string;
  };
  
  // Membership details
  joined_at: string;
  invited_by: string;
  last_activity: string;
  
  // Permissions
  permissions: TeamPermissions;
  
  // Activity tracking
  activity_stats: {
    agents_created: number;
    workflows_created: number;
    executions_run: number;
    cost_generated: number;
    last_login: string;
  };
}

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';

export interface TeamPermissions {
  // General permissions
  can_view_team: boolean;
  can_edit_team: boolean;
  can_delete_team: boolean;
  can_manage_members: boolean;
  can_invite_members: boolean;
  can_manage_roles: boolean;
  
  // Agent permissions
  can_view_agents: boolean;
  can_create_agents: boolean;
  can_edit_agents: boolean;
  can_delete_agents: boolean;
  can_execute_agents: boolean;
  can_share_agents: boolean;
  
  // Workflow permissions
  can_view_workflows: boolean;
  can_create_workflows: boolean;
  can_edit_workflows: boolean;
  can_delete_workflows: boolean;
  can_execute_workflows: boolean;
  can_schedule_workflows: boolean;
  
  // Data permissions
  can_view_executions: boolean;
  can_view_logs: boolean;
  can_view_analytics: boolean;
  can_export_data: boolean;
  
  // Financial permissions
  can_view_costs: boolean;
  can_manage_billing: boolean;
  can_set_budgets: boolean;
  
  // Collaboration permissions
  can_create_discussions: boolean;
  can_comment: boolean;
  can_share_externally: boolean;
  
  // Resource permissions
  can_view_resources: boolean;
  can_create_resources: boolean;
  can_edit_resources: boolean;
  can_delete_resources: boolean;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: TeamRole;
  invited_by: string;
  created_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
}

export interface TeamActivity {
  id: string;
  team_id: string;
  user_id: string;
  action: TeamActivityType;
  resource_type: 'team' | 'member' | 'agent' | 'workflow' | 'execution';
  resource_id: string;
  metadata: Record<string, any>;
  created_at: string;
  
  // User information for display
  user: {
    full_name: string;
    avatar_url?: string;
  };
}

export type TeamActivityType = 
  | 'team_created' | 'team_updated' | 'team_deleted'
  | 'member_added' | 'member_removed' | 'member_role_changed'
  | 'agent_created' | 'agent_updated' | 'agent_deleted' | 'agent_executed'
  | 'workflow_created' | 'workflow_updated' | 'workflow_deleted' | 'workflow_executed'
  | 'invitation_sent' | 'invitation_accepted' | 'invitation_declined';

export interface TeamResource {
  id: string;
  team_id: string;
  type: 'agent' | 'workflow' | 'template';
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Access control
  visibility: 'team' | 'public' | 'private';
  shared_with: string[]; // User IDs with explicit access
  
  // Usage statistics
  usage_stats: {
    views: number;
    executions: number;
    favorites: number;
    last_used: string;
  };
  
  // Collaboration
  comments: TeamResourceComment[];
  tags: string[];
}

export interface TeamResourceComment {
  id: string;
  resource_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  
  // User information
  user: {
    full_name: string;
    avatar_url?: string;
  };
  
  // Thread support
  parent_id?: string;
  replies?: TeamResourceComment[];
}

export interface TeamDiscussion {
  id: string;
  team_id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Discussion metadata
  status: 'open' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  tags: string[];
  
  // Engagement
  participants: string[];
  message_count: number;
  last_activity: string;
  
  // User information
  author: {
    full_name: string;
    avatar_url?: string;
  };
}

class TeamCollaborationService {
  // ========================================
  // TEAM MANAGEMENT
  // ========================================

  /**
   * Create a new team
   */
  async createTeam(
    team: Omit<Team, 'id' | 'created_at' | 'updated_at' | 'stats' | 'subscription'>,
    createdBy: string
  ): Promise<Team> {
    try {
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const fullTeam: Team = {
        ...team,
        id: teamId,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stats: {
          member_count: 1,
          agent_count: 0,
          workflow_count: 0,
          execution_count: 0,
          total_cost: 0
        },
        subscription: {
          plan: 'free',
          limits: {
            max_agents: 10,
            max_workflows: 5,
            max_executions_per_month: 100,
            max_cost_per_month: 50
          },
          usage: {
            agents_used: 0,
            workflows_used: 0,
            executions_this_month: 0,
            cost_this_month: 0
          }
        }
      };

      // Save team to database
      await supabaseService.createTeam(fullTeam);

      // Add creator as owner
      await this.addTeamMember(teamId, createdBy, 'owner', createdBy);

      // Log activity
      await this.logTeamActivity(teamId, createdBy, 'team_created', 'team', teamId, {
        team_name: team.name
      });

      return fullTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  /**
   * Update team information
   */
  async updateTeam(
    teamId: string,
    updates: Partial<Team>,
    updatedBy: string
  ): Promise<Team> {
    try {
      // Check permissions
      await this.requirePermission(teamId, updatedBy, 'can_edit_team');

      const existingTeam = await supabaseService.getTeam(teamId);
      if (!existingTeam) {
        throw new Error('Team not found');
      }

      const updatedTeam: Team = {
        ...existingTeam,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await supabaseService.updateTeam(teamId, updatedTeam);

      // Log activity
      await this.logTeamActivity(teamId, updatedBy, 'team_updated', 'team', teamId, {
        changes: Object.keys(updates)
      });

      return updatedTeam;
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string, deletedBy: string): Promise<void> {
    try {
      // Check permissions (only owner can delete)
      const member = await this.getTeamMember(teamId, deletedBy);
      if (!member || member.role !== 'owner') {
        throw new Error('Only team owners can delete teams');
      }

      // Archive all team resources
      await this.archiveTeamResources(teamId);

      // Remove all members
      const members = await this.getTeamMembers(teamId);
      for (const member of members) {
        await this.removeTeamMember(teamId, member.user_id, deletedBy);
      }

      // Delete team
      await supabaseService.deleteTeam(teamId);

      // Log activity
      await this.logTeamActivity(teamId, deletedBy, 'team_deleted', 'team', teamId);
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  }

  // ========================================
  // MEMBER MANAGEMENT
  // ========================================

  /**
   * Invite user to team
   */
  async inviteTeamMember(
    teamId: string,
    email: string,
    role: TeamRole,
    invitedBy: string,
    message?: string
  ): Promise<TeamInvitation> {
    try {
      // Check permissions
      await this.requirePermission(teamId, invitedBy, 'can_invite_members');

      // Check if user is already a member
      const existingMember = await this.getTeamMemberByEmail(teamId, email);
      if (existingMember) {
        throw new Error('User is already a team member');
      }

      // Check team limits
      const team = await supabaseService.getTeam(teamId);
      if (!team) throw new Error('Team not found');

      if (team.stats.member_count >= team.settings.max_members) {
        throw new Error('Team has reached maximum member limit');
      }

      const invitation: TeamInvitation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        team_id: teamId,
        email,
        role,
        invited_by: invitedBy,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        status: 'pending',
        message
      };

      await supabaseService.createTeamInvitation(invitation);

      // Send invitation email (would integrate with email service)
      await this.sendInvitationEmail(invitation, team);

      // Log activity
      await this.logTeamActivity(teamId, invitedBy, 'invitation_sent', 'member', invitation.id, {
        email,
        role
      });

      return invitation;
    } catch (error) {
      console.error('Error inviting team member:', error);
      throw error;
    }
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<TeamMember> {
    try {
      const invitation = await supabaseService.getTeamInvitation(invitationId);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Invitation is no longer valid');
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Add user to team
      const member = await this.addTeamMember(invitation.team_id, userId, invitation.role, invitation.invited_by);

      // Update invitation status
      await supabaseService.updateTeamInvitation(invitationId, { status: 'accepted' });

      // Log activity
      await this.logTeamActivity(invitation.team_id, userId, 'invitation_accepted', 'member', member.id);

      return member;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Add team member directly
   */
  async addTeamMember(
    teamId: string,
    userId: string,
    role: TeamRole,
    addedBy: string
  ): Promise<TeamMember> {
    try {
      const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get user information
      const user = await supabaseService.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const member: TeamMember = {
        id: memberId,
        team_id: teamId,
        user_id: userId,
        role,
        status: 'active',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name || user.email,
          avatar_url: user.avatar_url,
          last_active: new Date().toISOString()
        },
        joined_at: new Date().toISOString(),
        invited_by: addedBy,
        last_activity: new Date().toISOString(),
        permissions: this.getRolePermissions(role),
        activity_stats: {
          agents_created: 0,
          workflows_created: 0,
          executions_run: 0,
          cost_generated: 0,
          last_login: new Date().toISOString()
        }
      };

      await supabaseService.createTeamMember(member);

      // Update team member count
      await this.updateTeamStats(teamId, { member_count: 1 });

      // Log activity
      await this.logTeamActivity(teamId, addedBy, 'member_added', 'member', memberId, {
        user_email: user.email,
        role
      });

      return member;
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }

  /**
   * Update team member role
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: TeamRole,
    updatedBy: string
  ): Promise<TeamMember> {
    try {
      // Check permissions
      await this.requirePermission(teamId, updatedBy, 'can_manage_roles');

      const member = await supabaseService.getTeamMember(memberId);
      if (!member) {
        throw new Error('Team member not found');
      }

      // Prevent changing own role (except owner can change their own role)
      const updater = await this.getTeamMember(teamId, updatedBy);
      if (member.user_id === updatedBy && updater?.role !== 'owner') {
        throw new Error('Cannot change your own role');
      }

      // Prevent removing the last owner
      if (member.role === 'owner' && newRole !== 'owner') {
        const owners = await this.getTeamMembersByRole(teamId, 'owner');
        if (owners.length === 1) {
          throw new Error('Cannot remove the last team owner');
        }
      }

      const updatedMember: TeamMember = {
        ...member,
        role: newRole,
        permissions: this.getRolePermissions(newRole),
        last_activity: new Date().toISOString()
      };

      await supabaseService.updateTeamMember(memberId, updatedMember);

      // Log activity
      await this.logTeamActivity(teamId, updatedBy, 'member_role_changed', 'member', memberId, {
        old_role: member.role,
        new_role: newRole,
        user_email: member.user.email
      });

      return updatedMember;
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(
    teamId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    try {
      // Check permissions
      await this.requirePermission(teamId, removedBy, 'can_manage_members');

      const member = await this.getTeamMember(teamId, userId);
      if (!member) {
        throw new Error('Team member not found');
      }

      // Prevent removing the last owner
      if (member.role === 'owner') {
        const owners = await this.getTeamMembersByRole(teamId, 'owner');
        if (owners.length === 1) {
          throw new Error('Cannot remove the last team owner');
        }
      }

      // Remove member
      await supabaseService.deleteTeamMember(member.id);

      // Update team member count
      await this.updateTeamStats(teamId, { member_count: -1 });

      // Transfer ownership of resources if needed
      await this.transferMemberResources(teamId, userId);

      // Log activity
      await this.logTeamActivity(teamId, removedBy, 'member_removed', 'member', member.id, {
        user_email: member.user.email,
        role: member.role
      });
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  }

  // ========================================
  // PERMISSIONS & ACCESS CONTROL
  // ========================================

  /**
   * Get role permissions
   */
  private getRolePermissions(role: TeamRole): TeamPermissions {
    const basePermissions: TeamPermissions = {
      can_view_team: true,
      can_edit_team: false,
      can_delete_team: false,
      can_manage_members: false,
      can_invite_members: false,
      can_manage_roles: false,
      can_view_agents: true,
      can_create_agents: false,
      can_edit_agents: false,
      can_delete_agents: false,
      can_execute_agents: false,
      can_share_agents: false,
      can_view_workflows: true,
      can_create_workflows: false,
      can_edit_workflows: false,
      can_delete_workflows: false,
      can_execute_workflows: false,
      can_schedule_workflows: false,
      can_view_executions: true,
      can_view_logs: false,
      can_view_analytics: false,
      can_export_data: false,
      can_view_costs: false,
      can_manage_billing: false,
      can_set_budgets: false,
      can_create_discussions: false,
      can_comment: false,
      can_share_externally: false,
      can_view_resources: true,
      can_create_resources: false,
      can_edit_resources: false,
      can_delete_resources: false
    };

    switch (role) {
      case 'owner':
        return {
          can_view_team: true,
          can_edit_team: true,
          can_delete_team: true,
          can_manage_members: true,
          can_invite_members: true,
          can_manage_roles: true,
          can_view_agents: true,
          can_create_agents: true,
          can_edit_agents: true,
          can_delete_agents: true,
          can_execute_agents: true,
          can_share_agents: true,
          can_view_workflows: true,
          can_create_workflows: true,
          can_edit_workflows: true,
          can_delete_workflows: true,
          can_execute_workflows: true,
          can_schedule_workflows: true,
          can_view_executions: true,
          can_view_logs: true,
          can_view_analytics: true,
          can_export_data: true,
          can_view_costs: true,
          can_manage_billing: true,
          can_set_budgets: true,
          can_create_discussions: true,
          can_comment: true,
          can_share_externally: true,
          can_view_resources: true,
          can_create_resources: true,
          can_edit_resources: true,
          can_delete_resources: true
        };

      case 'admin':
        return {
          ...basePermissions,
          can_edit_team: true,
          can_manage_members: true,
          can_invite_members: true,
          can_manage_roles: true,
          can_create_agents: true,
          can_edit_agents: true,
          can_delete_agents: true,
          can_execute_agents: true,
          can_share_agents: true,
          can_create_workflows: true,
          can_edit_workflows: true,
          can_delete_workflows: true,
          can_execute_workflows: true,
          can_schedule_workflows: true,
          can_view_logs: true,
          can_view_analytics: true,
          can_export_data: true,
          can_view_costs: true,
          can_set_budgets: true,
          can_create_discussions: true,
          can_comment: true,
          can_share_externally: true
        };

      case 'editor':
        return {
          ...basePermissions,
          can_invite_members: true,
          can_create_agents: true,
          can_edit_agents: true,
          can_execute_agents: true,
          can_share_agents: true,
          can_create_workflows: true,
          can_edit_workflows: true,
          can_execute_workflows: true,
          can_view_logs: true,
          can_view_analytics: true,
          can_view_costs: true,
          can_create_discussions: true,
          can_comment: true
        };

      case 'viewer':
        return {
          ...basePermissions,
          can_execute_agents: true,
          can_execute_workflows: true,
          can_comment: true
        };

      case 'guest':
        return basePermissions;

      default:
        return basePermissions;
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    teamId: string,
    userId: string,
    permission: keyof TeamPermissions
  ): Promise<boolean> {
    try {
      const member = await this.getTeamMember(teamId, userId);
      if (!member || member.status !== 'active') {
        return false;
      }

      return member.permissions[permission];
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Require permission (throws if not allowed)
   */
  async requirePermission(
    teamId: string,
    userId: string,
    permission: keyof TeamPermissions
  ): Promise<void> {
    const hasPermission = await this.hasPermission(teamId, userId, permission);
    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  // ========================================
  // RESOURCE SHARING & COLLABORATION
  // ========================================

  /**
   * Share team resource
   */
  async shareResource(
    teamId: string,
    resourceId: string,
    resourceType: 'agent' | 'workflow' | 'template',
    sharedBy: string,
    shareWith: string[],
    visibility: 'team' | 'public' | 'private'
  ): Promise<TeamResource> {
    try {
      // Check permissions
      await this.requirePermission(teamId, sharedBy, 'can_share_agents'); // Use can_share_agents as general sharing permission

      const resource: TeamResource = {
        id: resourceId,
        team_id: teamId,
        type: resourceType,
        name: '', // Will be populated from actual resource
        description: '',
        created_by: sharedBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        visibility,
        shared_with: shareWith,
        usage_stats: {
          views: 0,
          executions: 0,
          favorites: 0,
          last_used: new Date().toISOString()
        },
        comments: [],
        tags: []
      };

      await supabaseService.createTeamResource(resource);

      // Log activity
      await this.logTeamActivity(teamId, sharedBy, 'agent_created', 'agent', resourceId, {
        resource_type: resourceType,
        visibility,
        shared_with_count: shareWith.length
      });

      return resource;
    } catch (error) {
      console.error('Error sharing resource:', error);
      throw error;
    }
  }

  /**
   * Add comment to resource
   */
  async addResourceComment(
    teamId: string,
    resourceId: string,
    content: string,
    userId: string,
    parentId?: string
  ): Promise<TeamResourceComment> {
    try {
      // Check permissions
      await this.requirePermission(teamId, userId, 'can_comment');

      const user = await supabaseService.getUser(userId);
      if (!user) throw new Error('User not found');

      const comment: TeamResourceComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        resource_id: resourceId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
        user: {
          full_name: user.full_name || user.email,
          avatar_url: user.avatar_url
        },
        parent_id: parentId
      };

      await supabaseService.createResourceComment(comment);

      return comment;
    } catch (error) {
      console.error('Error adding resource comment:', error);
      throw error;
    }
  }

  /**
   * Create team discussion
   */
  async createDiscussion(
    teamId: string,
    title: string,
    content: string,
    createdBy: string,
    category: string = 'general',
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<TeamDiscussion> {
    try {
      // Check permissions
      await this.requirePermission(teamId, createdBy, 'can_create_discussions');

      const user = await supabaseService.getUser(createdBy);
      if (!user) throw new Error('User not found');

      const discussion: TeamDiscussion = {
        id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        team_id: teamId,
        title,
        content,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'open',
        priority,
        category,
        tags: [],
        participants: [createdBy],
        message_count: 1,
        last_activity: new Date().toISOString(),
        author: {
          full_name: user.full_name || user.email,
          avatar_url: user.avatar_url
        }
      };

      await supabaseService.createTeamDiscussion(discussion);

      return discussion;
    } catch (error) {
      console.error('Error creating discussion:', error);
      throw error;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private async getTeamMember(teamId: string, userId: string): Promise<TeamMember | null> {
    try {
      return await supabaseService.getTeamMemberByUserId(teamId, userId);
    } catch (error) {
      console.error('Error getting team member:', error);
      return null;
    }
  }

  private async getTeamMemberByEmail(teamId: string, email: string): Promise<TeamMember | null> {
    try {
      return await supabaseService.getTeamMemberByEmail(teamId, email);
    } catch (error) {
      console.error('Error getting team member by email:', error);
      return null;
    }
  }

  private async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      return await supabaseService.getTeamMembers(teamId);
    } catch (error) {
      console.error('Error getting team members:', error);
      return [];
    }
  }

  private async getTeamMembersByRole(teamId: string, role: TeamRole): Promise<TeamMember[]> {
    try {
      const members = await this.getTeamMembers(teamId);
      return members.filter(member => member.role === role);
    } catch (error) {
      console.error('Error getting team members by role:', error);
      return [];
    }
  }

  private async updateTeamStats(teamId: string, changes: Partial<Team['stats']>): Promise<void> {
    try {
      const team = await supabaseService.getTeam(teamId);
      if (!team) return;

      const updatedStats = { ...team.stats };
      for (const [key, value] of Object.entries(changes)) {
        if (typeof value === 'number') {
          (updatedStats as any)[key] += value;
        }
      }

      await supabaseService.updateTeamStats(teamId, updatedStats);
    } catch (error) {
      console.error('Error updating team stats:', error);
    }
  }

  private async logTeamActivity(
    teamId: string,
    userId: string,
    action: TeamActivityType,
    resourceType: 'team' | 'member' | 'agent' | 'workflow' | 'execution',
    resourceId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const user = await supabaseService.getUser(userId);
      if (!user) return;

      const activity: TeamActivity = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        team_id: teamId,
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata,
        created_at: new Date().toISOString(),
        user: {
          full_name: user.full_name || user.email,
          avatar_url: user.avatar_url
        }
      };

      await supabaseService.createTeamActivity(activity);
    } catch (error) {
      console.error('Error logging team activity:', error);
    }
  }

  private async sendInvitationEmail(invitation: TeamInvitation, team: Team): Promise<void> {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    console.log(`Sending invitation email to ${invitation.email} for team ${team.name}`);
    // Email sending implementation would go here
  }

  private async archiveTeamResources(teamId: string): Promise<void> {
    try {
      // Archive agents, workflows, and other resources
      // Implementation would depend on how resources are stored
      console.log(`Archiving resources for team ${teamId}`);
    } catch (error) {
      console.error('Error archiving team resources:', error);
    }
  }

  private async transferMemberResources(teamId: string, userId: string): Promise<void> {
    try {
      // Transfer ownership of resources to team admin/owner
      // Implementation would depend on resource structure
      console.log(`Transferring resources for user ${userId} in team ${teamId}`);
    } catch (error) {
      console.error('Error transferring member resources:', error);
    }
  }

  // ========================================
  // PUBLIC API METHODS
  // ========================================

  /**
   * Get teams for user
   */
  async getUserTeams(userId: string): Promise<Team[]> {
    try {
      return await supabaseService.getUserTeams(userId);
    } catch (error) {
      console.error('Error getting user teams:', error);
      return [];
    }
  }

  /**
   * Get team details
   */
  async getTeam(teamId: string): Promise<Team | null> {
    try {
      return await supabaseService.getTeam(teamId);
    } catch (error) {
      console.error('Error getting team:', error);
      return null;
    }
  }

  /**
   * Get team activity feed
   */
  async getTeamActivity(teamId: string, limit: number = 50): Promise<TeamActivity[]> {
    try {
      return await supabaseService.getTeamActivity(teamId);
    } catch (error) {
      console.error('Error getting team activity:', error);
      return [];
    }
  }

  /**
   * Get team analytics
   */
  async getTeamAnalytics(teamId: string, days: number = 30): Promise<any> {
    try {
      return await supabaseService.getTeamAnalytics(teamId);
    } catch (error) {
      console.error('Error getting team analytics:', error);
      return null;
    }
  }

  /**
   * Search teams (public teams only)
   */
  async searchTeams(query: string, limit: number = 20): Promise<Team[]> {
    try {
      return await supabaseService.searchPublicTeams(query);
    } catch (error) {
      console.error('Error searching teams:', error);
      return [];
    }
  }
}

export const teamCollaborationService = new TeamCollaborationService();