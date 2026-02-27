import { supabase } from './supabase';

/**
 * Logs an action to the audit_logs table.
 * @param {string} action - The action performed (e.g., 'CREATE_BRANCH', 'UPDATE_PRODUCT')
 * @param {string} entityType - The type of entity (e.g., 'branches', 'products')
 * @param {string} entityId - The ID of the entity affected
 * @param {Object} details - Additional JSON details about the change
 */
export const logAction = async (action, entityType = null, entityId = null, details = {}) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action,
            entity_type: entityType,
            entity_id: entityId,
            details
        });
    } catch (err) {
        console.error('Audit log failed:', err);
    }
};
