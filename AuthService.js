import { supabase } from './src/supabaseClient';

export class AuthService {

    // Registro de nuevo usuario (añadimos name)
    static async signUp(email, password, name) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
            }
        });

        if (error) throw error;
        return data.user;
    }

    // Iniciar sesión
    static async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data.user;
    }

    // Cerrar sesión
    static async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    // Obtener sesión actual
    static async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            console.error(error);
            return null;
        }

        return user;
    }

    // Obtener nombre + email fácilmente
    static async getUserInfo() {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        return {
            name: user.user_metadata?.name || "Usuario",
            email: user.email
        };
    }
}