import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation';

const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
    const {  isAuthenticated } = await auth();

    if (isAuthenticated) redirect("/dashboard");

    return (
        <div>
            {children}
        </div>
    )
}

export default AuthLayout