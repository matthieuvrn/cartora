import type { AuthAdminService } from "@/application/ports/AuthAdminService";
import { createClient } from "@supabase/supabase-js";

export class SupabaseAuthAdminService implements AuthAdminService {
  private readonly client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.client.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Auth user deletion failed: ${error.message}`);
  }
}
