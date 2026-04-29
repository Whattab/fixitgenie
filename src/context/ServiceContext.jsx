import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const ServiceContext = createContext(null);

export const ServiceProvider = ({ children }) => {
    const [requests, setRequests] = useState([]);
    const { user } = useAuth();

    // Fetch requests on mount or when auth state changes (if we want to filter)
    useEffect(() => {
        fetchRequests();

        // Real-time subscription for updates
        const channel = supabase
            .channel('service_requests_channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'service_requests' },
                () => { fetchRequests(); }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchRequests = async () => {
        const { data, error } = await supabase
            .from('service_requests')
            .select('*')
            .eq('status', 'open')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching service requests:', error);
        } else {
            // Map DB fields to simpler camelCase if needed, or update components to match DB
            // For now, let's keep it simple and update components to use snake_case or map here.
            // Mapping to current component expectations (camelCase) for smoother migration:
            const mappedRequests = data.map(req => ({
                id: req.id,
                userId: req.user_id,
                category: req.category,
                details: req.details,
                urgency: req.urgency,
                cityState: req.city_state,
                contactName: req.contact_name,
                contactEmail: req.contact_email,
                contactPhone: req.contact_phone,
                contactMethod: req.contact_method,
                propertyType: req.property_type,
                homeAge: req.home_age,
                primaryResidence: req.primary_residence,
                serviceGoal: req.service_goal,
                serviceTime: req.service_time,
                startTime: req.start_time,
                createdAt: req.created_at,
                status: req.status
            }));
            setRequests(mappedRequests);
        }
    };

    const addRequest = async (newRequest) => {
        try {
            if (!user) return { success: false, message: 'Must be logged in' };

            // 1. Insert Public Request Data
            // We consciously EXCLUDE contact info from this insert
            const publicPayload = {
                user_id: user.id,
                category: newRequest.category,
                details: newRequest.details,
                urgency: newRequest.urgency,
                city_state: newRequest.cityState ? `${newRequest.cityState} ${newRequest.zipCode}` : newRequest.zipCode, // Public location incorporates zip for filtering
                property_type: newRequest.propertyType,
                home_age: newRequest.homeAge,
                primary_residence: newRequest.primaryResidence,
                service_goal: newRequest.serviceGoal,
                service_time: newRequest.serviceTime,
                start_time: newRequest.startTime,
                status: 'open'
                // contact_name, email, etc are NOT included here anymore
            };

            const { data: requestData, error: reqError } = await supabase
                .from('service_requests')
                .insert([publicPayload])
                .select()
                .single();

            if (reqError) throw reqError;

            // 2. Insert Private Contact Info
            // This goes to the secure table
            const { error: privateError } = await supabase
                .from('request_contact_info')
                .insert([{
                    request_id: requestData.id,
                    contact_name: newRequest.contactName,
                    contact_email: newRequest.contactEmail,
                    contact_phone: newRequest.contactPhone,
                    exact_address: newRequest.zipCode // Using zip for address for now as placeholder
                }]);

            if (privateError) {
                console.error("Error saving private info:", privateError);
                // We might want to handle partial failure, but for now just logging
            }

            // Update local state
            await fetchRequests();
            return { success: true, data: requestData };

        } catch (error) {
            console.error("Error adding request:", error);
            return { success: false, message: error.message };
        }
    };


    const deleteRequest = async (requestId) => {
        try {
            if (!user) return { success: false, message: 'Must be logged in' };

            const { error } = await supabase
                .from('service_requests')
                .delete()
                .eq('id', requestId);

            if (error) throw error;

            // Update local state
            await fetchRequests();
            return { success: true };
        } catch (error) {
            console.error("Error deleting request:", error);
            return { success: false, message: error.message };
        }
    };

    return (
        <ServiceContext.Provider value={{ requests, addRequest, deleteRequest }}>
            {children}
        </ServiceContext.Provider>
    );
};

export const useService = () => {
    const context = useContext(ServiceContext);
    if (!context) {
        throw new Error('useService must be used within a ServiceProvider');
    }
    return context;
};
