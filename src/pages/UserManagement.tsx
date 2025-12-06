import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, Ban, CheckCircle, Loader2, Copy, Users, Pencil } from "lucide-react";
import { createAuditLog } from "@/lib/auditLog";
import { UserEditDialog } from "@/components/UserEditDialog";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  status: string | null;
  role: AppRole | null;
  created_at: string | null;
}

export default function UserManagement() {
  const { isAdmin, loading: roleLoading } = useRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    fullName: "",
    role: "worker" as AppRole,
    password: "",
  });
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  async function fetchUsers() {
    setLoading(true);
    
    // Fetch all user profiles with their roles
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, status, created_at");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setLoading(false);
      return;
    }

    // Fetch all roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    // Combine data
    const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
      const userRole = roles?.find(r => r.user_id === profile.id);
      return {
        ...profile,
        role: userRole?.role || null,
      };
    });

    setUsers(usersWithRoles);
    setLoading(false);
  }

  async function handleInviteUser() {
    if (!inviteData.email || !inviteData.password || !inviteData.role) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setInviting(true);

    try {
      // Create user using admin API via edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteData.email,
          password: inviteData.password,
          fullName: inviteData.fullName,
          role: inviteData.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to invite user');
      }

      // Show generated credentials
      setGeneratedCredentials({
        email: inviteData.email,
        password: inviteData.password,
      });

      await createAuditLog({
        action: 'customer_created',
        description: `Invited new user ${inviteData.email} with role ${inviteData.role}`,
        entityType: 'user',
      });

      toast({
        title: "User invited",
        description: `${inviteData.email} has been added successfully`,
      });

      // Reset form but keep dialog open to show credentials
      setInviteData({ email: "", fullName: "", role: "worker", password: "" });
      fetchUsers();
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite user",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleStatus(user: UserWithRole) {
    const newStatus = user.status === "active" ? "blocked" : "active";
    
    const { error } = await supabase
      .from("user_profiles")
      .update({ status: newStatus })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
      return;
    }

    await createAuditLog({
      action: 'customer_updated',
      description: `${newStatus === 'blocked' ? 'Blocked' : 'Unblocked'} user ${user.email}`,
      entityType: 'user',
      entityId: user.id,
    });

    toast({
      title: "Status updated",
      description: `User ${user.email} has been ${newStatus === 'blocked' ? 'blocked' : 'activated'}`,
    });

    fetchUsers();
  }

  async function handleChangeRole(userId: string, newRole: AppRole) {
    const user = users.find(u => u.id === userId);
    
    // Update role
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
      return;
    }

    await createAuditLog({
      action: 'customer_updated',
      description: `Changed role for ${user?.email} to ${newRole}`,
      entityType: 'user',
      entityId: userId,
    });

    toast({
      title: "Role updated",
      description: `User role has been changed to ${newRole}`,
    });

    fetchUsers();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  }

  function getRoleBadgeVariant(role: AppRole | null) {
    switch (role) {
      case "admin": return "default";
      case "manager": return "secondary";
      case "seller": return "outline";
      case "worker": return "outline";
      default: return "outline";
    }
  }

  function getStatusBadge(status: string | null) {
    if (status === "active") {
      return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    }
    if (status === "blocked") {
      return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Blocked</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage user access and permissions</p>
        </div>
        
        <Dialog open={inviteOpen} onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) setGeneratedCredentials(null);
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            {generatedCredentials ? (
              <>
                <DialogHeader>
                  <DialogTitle>User Created Successfully</DialogTitle>
                  <DialogDescription>
                    Share these credentials with the new user. They can use them to log in.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="flex gap-2">
                      <Input value={generatedCredentials.email} readOnly />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedCredentials.email)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="flex gap-2">
                      <Input value={generatedCredentials.password} readOnly />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedCredentials.password)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    setInviteOpen(false);
                    setGeneratedCredentials(null);
                  }}>Done</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account and assign a role. You'll set a temporary password for them.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteData.email}
                      onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={inviteData.fullName}
                      onChange={(e) => setInviteData(prev => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Temporary Password *</Label>
                    <Input
                      id="password"
                      type="text"
                      placeholder="Enter a temporary password"
                      value={inviteData.password}
                      onChange={(e) => setInviteData(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={inviteData.role}
                      onValueChange={(value: AppRole) => setInviteData(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager - Full order access</SelectItem>
                        <SelectItem value="seller">Seller - Own customers & orders only</SelectItem>
                        <SelectItem value="worker">Worker - Manufacturing stages only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button onClick={handleInviteUser} disabled={inviting}>
                    {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name || "No name"}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role || "worker"}
                        onValueChange={(value: AppRole) => handleChangeRole(user.id, value)}
                        disabled={user.email === "ulad@decawindows.com"}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="seller">Seller</SelectItem>
                          <SelectItem value="worker">Worker</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-right">
                      {user.email !== "ulad@decawindows.com" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditUser(user);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant={user.status === "active" ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.status === "active" ? (
                              <>
                                <Ban className="h-3 w-3 mr-1" />
                                Block
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>What each role can do in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Admin</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Full access to everything</li>
                <li>• Manage all users</li>
                <li>• Block/unblock users</li>
                <li>• Invite new users</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Manager</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View & edit all orders</li>
                <li>• Create new orders</li>
                <li>• Manage all customers</li>
                <li>• Update manufacturing</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Seller</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create customers</li>
                <li>• Create orders</li>
                <li>• View own orders only</li>
                <li>• No manufacturing access</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Worker</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View all orders</li>
                <li>• Update manufacturing</li>
                <li>• Cannot create orders</li>
                <li>• Cannot modify orders</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={editUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
