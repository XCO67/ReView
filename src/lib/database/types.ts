export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  created_at: Date;
}

export interface UserWithRoles extends Omit<User, 'password_hash'> {
  roles: Role[];
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  name: string;
  role_ids: number[];
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  name?: string;
  password?: string;
  is_active?: boolean;
  role_ids?: number[];
}

