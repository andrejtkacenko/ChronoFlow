
'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


export default function ProfileSettings({ userId }: { userId: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
      if (user) {
          setDisplayName(user.displayName || '');
          setPhotoURL(user.photoURL || '');
      }
      setIsLoading(false);
  }, [user]);


  const handleSave = async () => {
    if (!auth.currentUser) {
        toast({ variant: 'destructive', title: 'Not authenticated.' });
        return;
    }
    setIsSaving(true);
    
    try {
        await updateProfile(auth.currentUser, {
            displayName: displayName,
            photoURL: photoURL
        });

        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            displayName: displayName,
            photoURL: photoURL
        }, { merge: true });

        toast({ title: 'Profile Updated', description: 'Your profile information has been saved.' });
    } catch (error) {
        console.error("Error saving profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your profile.' });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
  }
  
  return (
    <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <UserIcon className="size-8 text-primary"/>
                    Profile
                </h1>
                <p className="text-muted-foreground mt-1">Manage your public profile information.</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin"/> : <Save className="mr-2 size-4" />}
                Save Changes
            </Button>
        </div>
      
        <Card>
            <CardHeader>
                <CardTitle>User Information</CardTitle>
                <CardDescription>This information will be displayed on your profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className='flex items-center gap-6'>
                     <Avatar className="h-20 w-20">
                        <AvatarImage src={photoURL || undefined} alt="User Avatar" />
                        <AvatarFallback>{displayName?.[0].toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <div className='flex-1 space-y-4'>
                        <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your Name" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="photoURL">Photo URL</Label>
                            <Input id="photoURL" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://example.com/avatar.png" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
