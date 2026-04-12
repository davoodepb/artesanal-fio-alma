import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseAuth, firebaseStorage } from '@/integrations/firebase/client';
import { cn } from '@/lib/utils';
import { processImageForUpload } from '@/lib/imageUtils';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  className?: string;
  previewClassName?: string;
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'product-images',
  folder = 'uploads',
  label = 'Imagem',
  className,
  previewClassName,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageSource, setImageSource] = useState<'upload' | 'url'>(value ? 'url' : 'upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value && imageSource === 'url') {
      setImageSource('upload');
    }
  }, [value, imageSource]);

  const uploadToFirebase = async (file: File) => {
    const optimizedFile = await processImageForUpload(file);
    const fileExt = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const storagePath = `${bucket}/${fileName}`;

    // Prevent endless spinner when storage rules/bucket are misconfigured.
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Upload demorou demasiado tempo. Verifique Firebase Storage.')), 20000);
    });

    await Promise.race([
      uploadBytes(ref(firebaseStorage, storagePath), optimizedFile, { contentType: optimizedFile.type }),
      timeoutPromise,
    ]);

    return getDownloadURL(ref(firebaseStorage, storagePath));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um ficheiro de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);
    try {
      if (!firebaseAuth.currentUser) {
        toast.error('Faça login como admin para carregar imagens.');
        setIsUploading(false);
        return;
      }

      const publicUrl = await uploadToFirebase(file);
      onChange(publicUrl);
      setImageSource('upload');
      toast.success('Imagem carregada com sucesso!');
    } catch (error: any) {
      console.error('Upload error:', error);
      const msg = error?.message || '';
      toast.error('Erro ao carregar imagem: ' + (msg || 'Tente novamente ou use a opção URL'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={imageSource === 'upload' ? 'default' : 'outline'}
          onClick={() => setImageSource('upload')}
        >
          Upload imagem
        </Button>
        <Button
          type="button"
          size="sm"
          variant={imageSource === 'url' ? 'default' : 'outline'}
          onClick={() => setImageSource('url')}
        >
          URL da imagem
        </Button>
      </div>
      
      {value ? (
        <div className={cn('relative rounded-lg overflow-hidden border border-border group', previewClassName)}>
          <img
            src={value}
            alt="Pre-visualizacao da imagem carregada"
            className="w-full h-40 object-contain bg-white p-2"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              Trocar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remover
            </Button>
          </div>
        </div>
      ) : imageSource === 'upload' ? (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors',
            isUploading && 'pointer-events-none opacity-60'
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">A carregar...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Clique para carregar uma imagem
              </span>
              <span className="text-xs text-muted-foreground">
                PNG, JPG, WEBP (máx. 5MB)
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">
          Cole abaixo o URL da imagem.
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setImageSource('url');
            onChange(e.target.value);
          }}
          placeholder="https://..."
          className="text-xs"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

interface MultiImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  max?: number;
}

export function MultiImageUpload({
  values,
  onChange,
  bucket = 'product-images',
  folder = 'products',
  label = 'Imagens',
  max = 10,
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [imageSource, setImageSource] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToFirebase = async (file: File) => {
    const optimizedFile = await processImageForUpload(file);
    const fileExt = optimizedFile.name.split('.').pop() || 'webp';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const storagePath = `${bucket}/${fileName}`;
    await uploadBytes(ref(firebaseStorage, storagePath), optimizedFile, { contentType: optimizedFile.type });
    return getDownloadURL(ref(firebaseStorage, storagePath));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = max - values.length;
    if (files.length > remaining) {
      toast.error(`Pode adicionar no máximo mais ${remaining} imagens`);
      return;
    }

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      if (!firebaseAuth.currentUser) {
        toast.error('Faça login como admin para carregar imagens.');
        setIsUploading(false);
        return;
      }

      const validFiles = files.filter((f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
      for (const file of validFiles) {
        const publicUrl = await uploadToFirebase(file);
        newUrls.push(publicUrl);
      }

      onChange([...values, ...newUrls]);
      toast.success(`${newUrls.length} imagem(ns) carregada(s)!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao carregar imagens');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleAddUrl = () => {
    const url = manualUrl.trim();
    if (!url) {
      toast.error('Introduza um URL de imagem');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error('URL inválido. Use http:// ou https://');
      return;
    }
    if (values.length >= max) {
      toast.error(`Limite de ${max} imagens atingido`);
      return;
    }
    onChange([...values, url]);
    setManualUrl('');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={imageSource === 'upload' ? 'default' : 'outline'}
          onClick={() => setImageSource('upload')}
        >
          Upload imagem
        </Button>
        <Button
          type="button"
          size="sm"
          variant={imageSource === 'url' ? 'default' : 'outline'}
          onClick={() => setImageSource('url')}
        >
          URL da imagem
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {values.map((url, index) => (
          <div key={index} className="relative group rounded-lg overflow-hidden border border-border">
            <img
              src={url}
              alt={`Imagem carregada ${index + 1}`}
              className="w-full h-24 object-contain bg-white p-1"
              loading="lazy"
              decoding="async"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        {values.length < max && imageSource === 'upload' && (
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg h-24 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {imageSource === 'url' && (
        <div className="flex gap-2">
          <Input
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://..."
            className="text-xs"
          />
          <Button type="button" variant="outline" onClick={handleAddUrl}>
            Adicionar URL
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
