import { userRoleLabels } from '@/components/status-badges';
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type SharedData, type User } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Building2, LogOut, Settings } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const { department } = usePage<SharedData>().props.auth;

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex flex-col gap-1.5 px-1 py-1.5 text-left text-sm">
                    <div className="flex items-center gap-2">
                        <UserInfo user={user} showEmail={true} />
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 pl-10 text-xs">
                        <span>{userRoleLabels[user.role]}</span>
                        {/* A department head's every screen is bounded by this, so it is worth
                            naming somewhere they can always reach. */}
                        {department && (
                            <>
                                <span aria-hidden>·</span>
                                <span className="inline-flex items-center gap-1">
                                    <Building2 className="size-3" />
                                    {department.name}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link className="block w-full" href={route('profile.edit')} as="button" prefetch onClick={cleanup}>
                        <Settings className="mr-2" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link className="block w-full" method="post" href={route('logout')} as="button" onClick={cleanup}>
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
