import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error("Error recovering session:", error);
            }
            initializeUser(data?.session);
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            initializeUser(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const initializeUser = async (session) => {
        if (session?.user) {
            // Fetch profile data (name, type, role) from profiles table
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            setUser({ ...session.user, ...profile });
        } else {
            setUser(null);
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                console.error("Supabase Login Error:", error);
                return { success: false, message: error.message || "Login failed due to an unknown error." };
            }
            return { success: true };
        } catch (err) {
            console.error("Unexpected Login Error:", err);
            return { success: false, message: "An unexpected error occurred. Please try again." };
        }
    };

    const signup = async (userData) => {
        try {
            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
            });

            if (authError) {
                console.error("Supabase Signup Error:", authError);
                return { success: false, message: authError.message || "Signup failed due to an unknown error." };
            }

            // 2. Create Profile entry
            if (authData.user) {
                const profileData = {
                    id: authData.user.id,
                    email: userData.email,
                    name: userData.name,
                    type: userData.type, // homeowner or professional
                    role: userData.role || 'user',
                    zipcode: userData.zipcode || '',
                    city: userData.city || '',
                    state: userData.state || '',
                    avatar: userData.avatar || null
                };

                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([profileData]);

                if (profileError) {
                    console.error("Profile creation failed:", profileError);
                    // We don't return failure here as the auth user is created. 
                    // User might need to update profile later.
                } else {
                    setUser({ ...authData.user, ...profileData });
                }
            }

            return { success: true };
        } catch (err) {
            console.error("Unexpected Signup Error:", err);
            return { success: false, message: "An unexpected error occurred. Please try again." };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const [allUsers, setAllUsers] = useState([]);

    useEffect(() => {
        let subscription;
        if (user?.role === 'admin') {
            fetchAllUsers();

            subscription = supabase
                .channel('admin_profiles_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                    console.log("Profiles table changed, refreshing users...", payload);
                    fetchAllUsers();
                })
                .subscribe();
        }

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [user]);

    const fetchAllUsers = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching users:", error);
        else setAllUsers(data || []);
    };

    const deleteUser = async (targetUserId) => {
        // Delete related data first to avoid foreign key violations
        await supabase.from('portfolios').delete().eq('pro_id', targetUserId);
        await supabase.from('professional_details').delete().eq('pro_id', targetUserId);
        await supabase.from('service_requests').delete().eq('user_id', targetUserId);
        await supabase.from('bids').delete().eq('pro_id', targetUserId);

        // Delete from profiles table. 
        // Note: This leaves the auth user orphan. To fully delete auth user, an RPC or Edge Function is needed.
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', targetUserId);

        if (error) {
            console.error("Error deleting user profile:", error);
            alert("Failed to delete user: " + error.message);
        } else {
            setAllUsers(prev => prev.filter(u => u.id !== targetUserId));
            alert("User profile and data deleted. Note: The login email is still reserved in the auth system. To completely wipe the login so they can sign up again, you must run the admin RPC script we provide to delete the auth.users record.");
        }
    };

    const promoteUser = async (targetUserId) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', targetUserId);

        if (error) {
            console.error("Error promoting user:", error);
            alert("Failed to promote user: " + error.message);
        } else {
            fetchAllUsers(); // Refresh list
        }
    };

    const demoteUser = async (targetUserId) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', targetUserId);

        if (error) {
            console.error("Error demoting user:", error);
            alert("Failed to demote user: " + error.message);
        } else {
            fetchAllUsers(); // Refresh list
        }
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return { success: false, message: error.message };
        return { success: true };
    };

    // Update Password (for after clicking reset link)
    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, message: error.message };
        return { success: true };
    };

    // Re-fetch the current user's profile from the DB and update in-memory state.
    // Call this after any place the user edits their own profile so the rest of
    // the UI (header avatar, welcome name, etc.) reflects the change without a refresh.
    const refreshUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
        setUser({ ...session.user, ...profile });
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, deleteUser, promoteUser, demoteUser, resetPassword, updatePassword, refreshUser, loading, allUsers, fetchAllUsers }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
