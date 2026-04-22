// Supabase database class - replaces localStorage ClinicDB
import { supabase } from '../config/supabase';
import { hasRequestedTests } from './labRequestHelpers';

class SupabaseDB {
    // No constructor needed - Supabase handles initialization

    // Generic methods that work with any table
    async getAll(table) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .order('id', { ascending: true });
            
            if (error) {
                // If table doesn't exist, error code is PGRST116
                if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                    console.warn(`Table "${table}" does not exist in Supabase. Please create it first.`);
                    return [];
                }
                console.error(`Error fetching ${table}:`, error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error(`Error in getAll(${table}):`, err);
            return [];
        }
    }

    async getById(table, id) {
        try {
            const candidates = this._rowIdCandidates(id);
            const tryIds = candidates.length ? candidates : [id];

            for (const rowId of tryIds) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('id', rowId)
                    .maybeSingle();

                if (error) {
                    if (error.code !== 'PGRST116') {
                        console.error(`Error fetching ${table} by id:`, error);
                    }
                    continue;
                }
                if (data) return data;
            }
            return null;
        } catch (err) {
            console.error(`Error in getById(${table}, ${id}):`, err);
            return null;
        }
    }

    async add(table, data) {
        try {
            // Ensure created_date is set correctly
            const now = new Date();
            const recordData = {
                ...data,
                created_date: now.toISOString(),
                updated_date: now.toISOString()
            };
            
            console.log(`Adding to ${table}:`, recordData);
            
            const { data: result, error } = await supabase
                .from(table)
                .insert([recordData])
                .select()
                .single();
            
            if (error) {
                console.error(`❌ Error adding to ${table}:`, error);
                console.error('📋 Error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    fullError: JSON.stringify(error, null, 2)
                });
                
                // Show user-friendly error
                alert(`Database Error: ${error.message || 'Failed to add item'}\n\nDetails: ${error.details || error.hint || 'Unknown error'}\n\nPlease check the console for more information.`);
                return null;
            }
            
            console.log(`Successfully added to ${table}:`, result);
            return result;
        } catch (err) {
            console.error(`Error in add(${table}):`, err);
            return null;
        }
    }

    async update(table, id, data) {
        try {
            const ids = this._rowIdCandidates(id);
            const tryIds = ids.length ? ids : [id];
            let lastError = null;

            for (const rowId of tryIds) {
                const { data: updatedRows, error } = await supabase
                    .from(table)
                    .update({
                        ...data,
                        updated_date: new Date().toISOString()
                    })
                    .eq('id', rowId)
                    .select('id');

                if (error) {
                    lastError = error;
                    continue;
                }

                if (Array.isArray(updatedRows) && updatedRows.length > 0) {
                    return true;
                }
            }

            if (lastError) {
                console.error(`Error updating ${table}:`, lastError);
            }
            return false;
        } catch (err) {
            console.error(`Error in update(${table}, ${id}):`, err);
            return false;
        }
    }

    /** Try id as-is and as number (SERIAL/int PK vs string from JSON). */
    _rowIdCandidates(id) {
        if (id === undefined || id === null || id === '') return [];
        const out = new Set();
        out.add(id);
        const n = Number(id);
        if (!Number.isNaN(n) && Number.isFinite(n)) {
            out.add(n);
        }
        return [...out];
    }

    async delete(table, id) {
        try {
            const ids = this._rowIdCandidates(id);
            const tryIds = ids.length ? ids : [id];
            let lastError = null;

            for (const rowId of tryIds) {
                const { data, error } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', rowId)
                    .select();

                if (error) {
                    lastError = error;
                    continue;
                }
                if (data && data.length > 0) {
                    console.log(`✅ Successfully deleted from ${table}:`, data);
                    return true;
                }
            }

            if (lastError) {
                console.error(`❌ Error deleting from ${table}:`, lastError);
                throw new Error(lastError.message || `Failed to delete from ${table}`);
            }
            throw new Error(`No matching row to delete in ${table}`);
        } catch (err) {
            console.error(`Error in delete(${table}, ${id}):`, err);
            throw err;
        }
    }

    /** visit_id can be stored as int/bigint while JS sometimes passes string — try both. */
    _visitIdCandidates(visitId) {
        if (visitId === undefined || visitId === null || visitId === '') return [];
        const out = new Set();
        out.add(visitId);
        const n = Number(visitId);
        if (!Number.isNaN(n) && Number.isFinite(n)) {
            out.add(n);
        }
        return [...out];
    }

    /** Delete lab_requests row(s) for this visit — uses visit_id match (works even if row id types differ). */
    async deleteLabRequestsForVisit(visitId) {
        try {
            const candidates = this._visitIdCandidates(visitId);
            if (candidates.length === 0) {
                return;
            }
            let lastError = null;
            for (const vid of candidates) {
                const { data, error } = await supabase
                    .from('lab_requests')
                    .delete()
                    .eq('visit_id', vid)
                    .select('id');

                if (error) {
                    lastError = error;
                    continue;
                }
                if (data && data.length > 0) {
                    return;
                }
            }
            if (lastError) {
                throw new Error(lastError.message || 'Failed to delete lab request');
            }
        } catch (err) {
            console.error('Error in deleteLabRequestsForVisit:', err);
            throw err;
        }
    }

    /** One row for a visit (avoids loading all lab_requests). */
    async getLabRequestByVisitId(visitId) {
        try {
            const candidates = this._visitIdCandidates(visitId);
            for (const vid of candidates) {
                const { data, error } = await supabase
                    .from('lab_requests')
                    .select('*')
                    .eq('visit_id', vid)
                    .limit(1);

                if (error) {
                    console.error('Error fetching lab_requests by visit_id:', error);
                    continue;
                }
                if (data && data.length > 0) return data[0];
            }
            return null;
        } catch (err) {
            console.error('Error in getLabRequestByVisitId:', err);
            return null;
        }
    }

    /** Single request: remove all lab queue rows for a visit (faster than N delete-by-id calls). */
    async deleteLabQueueForVisit(visitId) {
        try {
            const candidates = this._visitIdCandidates(visitId);
            if (candidates.length === 0) {
                return true;
            }
            let lastError = null;
            for (const vid of candidates) {
                // Must check returned rows: PostgREST returns no error when 0 rows match (wrong type).
                const { data, error } = await supabase
                    .from('queue')
                    .delete()
                    .eq('visit_id', vid)
                    .eq('department', 'lab')
                    .select('id');

                if (error) {
                    lastError = error;
                    continue;
                }
                if (data && data.length > 0) {
                    return true;
                }
            }
            if (lastError) {
                console.error('Error deleting lab queue rows:', lastError);
                throw new Error(lastError.message || 'Failed to remove lab queue');
            }
            return true;
        } catch (err) {
            console.error('Error in deleteLabQueueForVisit:', err);
            throw err;
        }
    }

    /** Returns whether any lab queue row exists for this visit (single small query). */
    async hasLabQueueForVisit(visitId) {
        try {
            const candidates = this._visitIdCandidates(visitId);
            for (const vid of candidates) {
                const { data, error } = await supabase
                    .from('queue')
                    .select('id')
                    .eq('visit_id', vid)
                    .eq('department', 'lab')
                    .limit(1);

                if (error) {
                    console.error('Error checking lab queue:', error);
                    continue;
                }
                if (Array.isArray(data) && data.length > 0) return true;
            }
            return false;
        } catch (err) {
            console.error('Error in hasLabQueueForVisit:', err);
            return false;
        }
    }

    // Specific methods for clinic operations
    async findPatientByMobile(mobile) {
        if (!mobile) return null;
        
        try {
            const normalizeMobile = (num) => {
                if (!num) return '';
                return num.toString().trim().replace(/^0+/, '');
            };
            
            const searchMobile = normalizeMobile(mobile);
            
            const { data, error } = await supabase
                .from('patients')
                .select('*');
            
            if (error) {
                console.error('Error finding patient:', error);
                return null;
            }
            
            // Try exact match first
            let patient = data.find(p => {
                const patientMobile = normalizeMobile(p.mobile);
                return patientMobile === searchMobile;
            });
            
            // If not found, try partial match
            if (!patient) {
                patient = data.find(p => {
                    const patientMobile = normalizeMobile(p.mobile);
                    return patientMobile.includes(searchMobile) || searchMobile.includes(patientMobile);
                });
            }
            
            return patient || null;
        } catch (err) {
            console.error('Error in findPatientByMobile:', err);
            return null;
        }
    }

    async getTodayVisits() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('visits')
                .select('*')
                .gte('created_date', `${today}T00:00:00`)
                .lte('created_date', `${today}T23:59:59`);
            
            if (error) {
                // Handle network errors (502, CORS, etc.)
                if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                    console.warn('Network error fetching today visits. Supabase service may be temporarily unavailable.');
                    return [];
                }
                console.error('Error fetching today visits:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            // Handle network errors gracefully
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
                console.warn('Network error in getTodayVisits. Supabase service may be temporarily unavailable:', err.message);
                return [];
            }
            console.error('Error in getTodayVisits:', err);
            return [];
        }
    }

    async getPatientVisits(patientId) {
        try {
            const { data, error } = await supabase
                .from('visits')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_date', { ascending: false });
            
            if (error) {
                console.error('Error fetching patient visits:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error('Error in getPatientVisits:', err);
            return [];
        }
    }

    /**
     * Best lab_requests row for a visit (prefers rows that list requested tests, then latest id).
     * Resolves test list whether stored in test_name or legacy tests column.
     */
    async getBestLabRequestForVisit(visitId) {
        try {
            const candidates = this._visitIdCandidates(visitId);
            if (candidates.length === 0) return null;

            const byId = new Map();
            for (const vid of candidates) {
                const { data, error } = await supabase
                    .from('lab_requests')
                    .select('*')
                    .eq('visit_id', vid);

                if (error) {
                    console.error('Error fetching lab_requests for visit:', error);
                    continue;
                }
                for (const row of data || []) {
                    if (row?.id != null) byId.set(row.id, row);
                }
            }

            const visitRequests = [...byId.values()];
            if (visitRequests.length === 0) return null;

            return visitRequests.sort((a, b) => {
                const aHasTests = hasRequestedTests(a);
                const bHasTests = hasRequestedTests(b);
                if (aHasTests !== bHasTests) {
                    return bHasTests ? 1 : -1;
                }
                return (Number(b?.id) || 0) - (Number(a?.id) || 0);
            })[0];
        } catch (err) {
            console.error('Error in getBestLabRequestForVisit:', err);
            return null;
        }
    }

    async getQueueForDepartment(dept) {
        try {
            const { data: queueData, error: queueError } = await supabase
                .from('queue')
                .select('*')
                .eq('department', dept)
                .neq('status', 'completed');
            
            if (queueError) {
                console.error('Error fetching queue:', queueError);
                return [];
            }
            
            if (!queueData || queueData.length === 0) {
                return [];
            }
            
            // Fetch related data - handle missing records gracefully
            const result = await Promise.all(
                queueData.map(async (q) => {
                    try {
                        const visit = await this.getById('visits', q.visit_id);
                        const patient = visit ? await this.getById('patients', visit.patient_id) : null;
                        
                        // Use getConsultationForVisit which handles missing consultations properly
                        const consultation = visit ? await this.getConsultationForVisit(visit.id) : null;

                        let labRequest = null;
                        if (dept === 'lab' && visit) {
                            labRequest = await this.getBestLabRequestForVisit(visit.id);
                        }
                        
                        return {
                            ...q,
                            visit: visit,
                            patient: patient,
                            consultation: consultation,
                            labRequest: labRequest
                        };
                    } catch (err) {
                        console.error(`Error processing queue item ${q.id}:`, err);
                        // Return queue item without related data rather than failing completely
                        return {
                            ...q,
                            visit: null,
                            patient: null,
                            consultation: null,
                            labRequest: null
                        };
                    }
                })
            );
            
            return result;
        } catch (err) {
            console.error('Error in getQueueForDepartment:', err);
            return [];
        }
    }

    async searchPatients(searchTerm) {
        try {
            if (!searchTerm) {
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .limit(50)
                    .order('id', { ascending: true });
                
                if (error) {
                    console.error('Error fetching patients:', error);
                    return [];
                }
                return data || [];
            }
            
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .or(`name.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%`)
                .limit(50);
            
            if (error) {
                console.error('Error searching patients:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error('Error in searchPatients:', err);
            return [];
        }
    }

    async getUserByUsername(username) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .maybeSingle(); // Use maybeSingle to avoid error if user doesn't exist
            
            if (error) {
                console.error('Error fetching user:', error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('Error in getUserByUsername:', err);
            return null;
        }
    }

    async getConsultationForVisit(visitId) {
        try {
            const { data, error } = await supabase
                .from('consultations')
                .select('*')
                .eq('visit_id', visitId)
                .order('created_date', { ascending: false })
                .limit(1);
            
            if (error) {
                console.error('Error fetching consultation:', error);
                return null;
            }
            // Return the first (most recent) consultation, or null if none exist
            return data && data.length > 0 ? data[0] : null;
        } catch (err) {
            console.error('Error in getConsultationForVisit:', err);
            return null;
        }
    }

    // Patient Ticket Methods
    async createTicket(ticketData) {
        try {
            console.log('Creating ticket with data:', ticketData);
            
            const { data: result, error } = await supabase
                .from('patient_tickets')
                .insert([{
                    ...ticketData,
                    status: 'active',
                    created_date: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) {
                console.error('Error creating ticket:', error);
                
                // Check if table doesn't exist
                if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                    throw new Error('DATABASE_TABLE_MISSING: The patient_tickets table does not exist. Please run CREATE_PATIENT_TICKETS_TABLE.sql in Supabase first.');
                }
                
                // Other errors
                throw new Error(error.message || 'Unknown database error');
            }
            
            console.log('Ticket created successfully:', result);
            return result;
        } catch (err) {
            console.error('Error in createTicket:', err);
            throw err; // Re-throw to handle in component
        }
    }

    async getTicketByCode(ticketCode) {
        try {
            const { data, error } = await supabase
                .from('patient_tickets')
                .select('*')
                .eq('ticket_code', ticketCode.toUpperCase())
                .single();
            
            if (error) {
                console.error('Error fetching ticket by code:', error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('Error in getTicketByCode:', err);
            return null;
        }
    }

    async getTicketByNumber(ticketNumber) {
        try {
            const { data, error } = await supabase
                .from('patient_tickets')
                .select('*')
                .eq('ticket_number', ticketNumber)
                .single();
            
            if (error) {
                console.error('Error fetching ticket by number:', error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('Error in getTicketByNumber:', err);
            return null;
        }
    }

    async getPatientTickets(patientId) {
        try {
            const { data, error } = await supabase
                .from('patient_tickets')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_date', { ascending: false });
            
            if (error) {
                console.error('Error fetching patient tickets:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error('Error in getPatientTickets:', err);
            return [];
        }
    }

    async getAllTickets() {
        try {
            const { data, error } = await supabase
                .from('patient_tickets')
                .select('*')
                .order('created_date', { ascending: false });
            
            if (error) {
                console.error('Error fetching all tickets:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error('Error in getAllTickets:', err);
            return [];
        }
    }

    async updateTicketStatus(ticketId, status, usedDate = null) {
        try {
            const updateData = {
                status: status,
                updated_date: new Date().toISOString()
            };
            
            if (usedDate) {
                updateData.used_date = usedDate;
            }

            const { error } = await supabase
                .from('patient_tickets')
                .update(updateData)
                .eq('id', ticketId);
            
            if (error) {
                console.error('Error updating ticket status:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error in updateTicketStatus:', err);
            return false;
        }
    }

    async getTicketWithPatient(ticketCode) {
        try {
            const ticket = await this.getTicketByCode(ticketCode);
            if (!ticket) return null;
            
            const patient = await this.getById('patients', ticket.patient_id);
            
            return {
                ...ticket,
                patient: patient
            };
        } catch (err) {
            console.error('Error in getTicketWithPatient:', err);
            return null;
        }
    }

    async getPatientWithVisits(patientId) {
        try {
            const patient = await this.getById('patients', patientId);
            if (!patient) return null;

            const visits = await this.getPatientVisits(patientId);
            
            // Get related data for all visits
            const [allConsultations, allLabRequests, allPrescriptions] = await Promise.all([
                this.getAll('consultations'),
                this.getAll('lab_requests'),
                this.getAll('prescriptions')
            ]);

            // Filter related data by visit IDs
            const consultations = allConsultations.filter(c => visits.some(v => v.id === c.visit_id));
            const labRequests = allLabRequests.filter(l => visits.some(v => v.id === l.visit_id));
            const prescriptions = allPrescriptions.filter(p => visits.some(v => v.id === p.visit_id));

            return {
                patient: patient,
                visits: visits,
                consultations: consultations,
                labRequests: labRequests,
                prescriptions: prescriptions
            };
        } catch (err) {
            console.error('Error in getPatientWithVisits:', err);
            return null;
        }
    }
}

export default SupabaseDB;

