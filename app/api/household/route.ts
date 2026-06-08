import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OWNER_PERMISSIONS = {
  all_modules: true,
  modules: [],
  can_edit: true,
  can_delete: true,
  can_manage_members: true,
  can_view_documents: true,
  can_upload_documents: true,
};

const PRESETS: Record<string, Record<string, unknown>> = {
  viewer: {
    all_modules: true,
    modules: [],
    can_edit: false,
    can_delete: false,
    can_manage_members: false,
    can_view_documents: true,
    can_upload_documents: false,
  },
  editor: {
    all_modules: true,
    modules: [],
    can_edit: true,
    can_delete: false,
    can_manage_members: false,
    can_view_documents: true,
    can_upload_documents: true,
  },
};

function error(message: string, status = 500, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

async function authenticate(req: NextRequest) {
  if (!url || !anonKey || !serviceKey) {
    return { error: error("Household access is not configured.", 500) };
  }
  const token = (req.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) return { error: error("Missing authorization token.", 401) };
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const serviceClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: error("Invalid session.", 401) };
  return { user, serviceClient };
}

function setupError(dbError: any) {
  const message = String(dbError?.message || "");
  if (
    /workspaces|workspace_members|workspace_id|schema cache|does not exist/i.test(
      message,
    )
  ) {
    return error(
      "Household database setup is required. Run supabase/household-workspaces.sql in the Supabase SQL editor.",
      503,
      "HOUSEHOLD_SCHEMA_REQUIRED",
    );
  }
  return null;
}

async function allAuthUsers(serviceClient: any) {
  const users: any[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error: listError } =
      await serviceClient.auth.admin.listUsers({ page, perPage: 100 });
    if (listError) throw listError;
    users.push(...(data?.users || []));
    if (!data?.users?.length || data.users.length < 100) return users;
  }
}

async function accessFor(serviceClient: any, workspaceId: string, userId: string) {
  const { data: workspace, error: workspaceError } = await serviceClient
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  if (!workspace) return null;
  if (workspace.owner_user_id === userId) {
    return { member_role: "owner", status: "active", ...OWNER_PERMISSIONS };
  }
  const { data: membership, error: memberError } = await serviceClient
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (memberError) throw memberError;
  return membership
    ? {
        member_role: membership.member_role,
        status: membership.status,
        ...(membership.permissions || {}),
      }
    : null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { user, serviceClient } = auth;

    const { data: memberships, error: memberError } = await serviceClient
      .from("workspace_members")
      .select("workspace_id,member_role,status,permissions")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (memberError) {
      return setupError(memberError) || error(memberError.message);
    }
    const workspaceIds = (memberships || []).map((row: any) => row.workspace_id);
    const { data: workspaces, error: workspaceError } = workspaceIds.length
      ? await serviceClient.from("workspaces").select("*").in("id", workspaceIds)
      : { data: [], error: null };
    if (workspaceError) throw workspaceError;

    const accessByWorkspace = new Map(
      (memberships || []).map((row: any) => [
        row.workspace_id,
        {
          member_role: row.member_role,
          status: row.status,
          ...(row.permissions || {}),
        },
      ]),
    );
    const result = (workspaces || [])
      .map((workspace: any) => ({
        ...workspace,
        access:
          workspace.owner_user_id === user.id
            ? { member_role: "owner", status: "active", ...OWNER_PERMISSIONS }
            : accessByWorkspace.get(workspace.id),
      }))
      .sort((a: any, b: any) => {
        const aOwner = a.owner_user_id === user.id ? 1 : 0;
        const bOwner = b.owner_user_id === user.id ? 1 : 0;
        return bOwner - aOwner || String(a.name).localeCompare(String(b.name));
      });

    const requestedId = req.nextUrl.searchParams.get("workspaceId");
    const active =
      result.find((workspace: any) => workspace.id === requestedId) || result[0];
    let members: any[] = [];
    if (active?.access?.can_manage_members) {
      const { data: memberRows, error: rowsError } = await serviceClient
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", active.id)
        .order("created_at");
      if (rowsError) throw rowsError;
      const ids = (memberRows || []).map((row: any) => row.user_id);
      const { data: profiles } = ids.length
        ? await serviceClient
            .from("profiles")
            .select("id,email,full_name")
            .in("id", ids)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      members = (memberRows || []).map((row: any) => ({
        ...row,
        profile: profileMap.get(row.user_id) || {},
      }));
    }
    return NextResponse.json({ workspaces: result, active, members });
  } catch (caught: any) {
    return setupError(caught) || error(caught?.message || "Household request failed.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { user, serviceClient } = auth;
    const body = await req.json();
    const action = String(body.action || "");
    const workspaceId = String(body.workspaceId || "");
    const access = workspaceId
      ? await accessFor(serviceClient, workspaceId, user.id)
      : null;

    if (action === "renameWorkspace") {
      if (access?.member_role !== "owner") return error("Primary account access required.", 403);
      const name = String(body.name || "").trim();
      if (!name) return error("Workspace name is required.", 400);
      const { error: updateError } = await serviceClient
        .from("workspaces")
        .update({ name })
        .eq("id", workspaceId);
      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, message: "Household renamed." });
    }

    if (!access?.can_manage_members) {
      return error("Member management permission is required.", 403);
    }

    if (action === "invite") {
      const emailAddress = String(body.email || "").trim().toLowerCase();
      if (!emailAddress) return error("Email is required.", 400);
      const users = await allAuthUsers(serviceClient);
      let target = users.find(
        (candidate: any) =>
          String(candidate.email || "").toLowerCase() === emailAddress,
      );
      let invited = false;
      if (!target) {
        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "https://gupta.vercel.app"}/`;
        const { data, error: inviteError } =
          await serviceClient.auth.admin.inviteUserByEmail(emailAddress, {
            redirectTo,
          });
        if (inviteError) throw inviteError;
        target = data.user;
        invited = true;
      }
      if (!target?.id) return error("Could not create member.", 500);
      if (target.id === user.id) return error("You already own this household.", 400);

      const role = ["viewer", "editor", "custom"].includes(body.member_role)
        ? body.member_role
        : "viewer";
      const permissions =
        role === "custom"
          ? {
              ...PRESETS.viewer,
              ...(body.permissions || {}),
              modules: Array.isArray(body.permissions?.modules)
                ? body.permissions.modules
                : [],
            }
          : PRESETS[role];
      const { error: upsertError } = await serviceClient
        .from("workspace_members")
        .upsert(
          {
            workspace_id: workspaceId,
            user_id: target.id,
            member_role: role,
            status: "active",
            permissions,
            invited_by: user.id,
          },
          { onConflict: "workspace_id,user_id" },
        );
      if (upsertError) throw upsertError;
      return NextResponse.json({
        ok: true,
        message: invited
          ? "Invitation emailed and household access prepared."
          : "Existing user added to the household.",
      });
    }

    const membershipId = String(body.membershipId || "");
    if (!membershipId) return error("Membership is required.", 400);
    const { data: membership, error: membershipError } = await serviceClient
      .from("workspace_members")
      .select("*")
      .eq("id", membershipId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return error("Membership not found.", 404);
    if (membership.member_role === "owner") {
      return error("The primary account cannot be changed or removed.", 400);
    }

    if (action === "removeMember") {
      const { error: deleteError } = await serviceClient
        .from("workspace_members")
        .delete()
        .eq("id", membershipId);
      if (deleteError) throw deleteError;
      return NextResponse.json({ ok: true, message: "Member access removed." });
    }
    if (action === "setStatus") {
      const status = body.status === "suspended" ? "suspended" : "active";
      const { error: statusError } = await serviceClient
        .from("workspace_members")
        .update({ status })
        .eq("id", membershipId);
      if (statusError) throw statusError;
      return NextResponse.json({ ok: true, message: `Member ${status}.` });
    }
    if (action === "updateMember") {
      const role = ["viewer", "editor", "custom"].includes(body.member_role)
        ? body.member_role
        : "viewer";
      const permissions =
        role === "custom"
          ? {
              ...PRESETS.viewer,
              ...(body.permissions || {}),
              modules: Array.isArray(body.permissions?.modules)
                ? body.permissions.modules
                : [],
            }
          : PRESETS[role];
      const { error: updateError } = await serviceClient
        .from("workspace_members")
        .update({ member_role: role, permissions, status: "active" })
        .eq("id", membershipId);
      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, message: "Member permissions updated." });
    }
    return error("Unknown household action.", 400);
  } catch (caught: any) {
    return setupError(caught) || error(caught?.message || "Household action failed.");
  }
}
