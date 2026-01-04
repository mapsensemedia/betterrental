import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  CreditCard, 
  AlertCircle, 
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { useBookingVerification, useUploadVerificationDocument } from '@/hooks/use-verification';

interface DriverLicenseUploadProps {
  bookingId: string;
}

const LICENSE_DOCUMENTS = [
  { id: 'drivers_license_front', label: "Driver's License (Front)", required: true },
  { id: 'drivers_license_back', label: "Driver's License (Back)", required: true },
];

export function DriverLicenseUpload({ bookingId }: DriverLicenseUploadProps) {
  const { data: verifications, isLoading } = useBookingVerification(bookingId);
  const uploadMutation = useUploadVerificationDocument();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getDocStatus = (docType: string) => {
    const doc = verifications?.find(v => v.document_type === docType);
    return doc || null;
  };

  const getLicenseStatus = () => {
    const front = getDocStatus('drivers_license_front');
    const back = getDocStatus('drivers_license_back');

    if (!front && !back) return 'required';
    if (!front || !back) return 'incomplete';
    
    if (front.status === 'rejected' || back.status === 'rejected') return 'rejected';
    if (front.status === 'verified' && back.status === 'verified') return 'verified';
    if (front.status === 'pending' || back.status === 'pending') return 'pending';
    
    return 'incomplete';
  };

  const handleFileSelect = async (docType: string, file: File) => {
    setUploadingType(docType);
    try {
      await uploadMutation.mutateAsync({
        bookingId,
        docType,
        file,
      });
    } finally {
      setUploadingType(null);
    }
  };

  const handleUploadClick = (docType: string) => {
    fileInputRefs.current[docType]?.click();
  };

  const status = getLicenseStatus();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Driver's License
            </CardTitle>
            <CardDescription>
              Upload photos of your driver's license (front and back)
            </CardDescription>
          </div>
          <Badge 
            variant={
              status === 'verified' ? 'default' :
              status === 'pending' ? 'secondary' :
              status === 'rejected' ? 'destructive' :
              'outline'
            }
            className={
              status === 'verified' ? 'bg-green-500' :
              status === 'pending' ? 'bg-yellow-500' :
              ''
            }
          >
            {status === 'verified' && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
            {status === 'required' && <AlertCircle className="h-3 w-3 mr-1" />}
            {status === 'incomplete' && <AlertCircle className="h-3 w-3 mr-1" />}
            {status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
            {status === 'verified' ? 'Verified' :
             status === 'pending' ? 'Under Review' :
             status === 'rejected' ? 'Rejected' :
             status === 'incomplete' ? 'Incomplete' :
             'Required'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'required' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please upload both sides of your driver's license to proceed with your booking.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LICENSE_DOCUMENTS.map((docType) => {
            const doc = getDocStatus(docType.id);
            const isUploading = uploadingType === docType.id;

            return (
              <div
                key={docType.id}
                className={`
                  relative border-2 border-dashed rounded-xl p-6 transition-colors text-center
                  ${doc?.status === 'verified' ? 'border-green-500 bg-green-500/5' : ''}
                  ${doc?.status === 'rejected' ? 'border-destructive bg-destructive/5' : ''}
                  ${doc?.status === 'pending' ? 'border-yellow-500 bg-yellow-500/5' : ''}
                  ${!doc ? 'border-muted-foreground/25 hover:border-primary cursor-pointer' : ''}
                `}
                onClick={() => !doc?.status || doc?.status === 'rejected' ? handleUploadClick(docType.id) : undefined}
              >
                <input
                  ref={(el) => (fileInputRefs.current[docType.id] = el)}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(docType.id, file);
                    }
                    e.target.value = '';
                  }}
                />

                <div className="flex flex-col items-center gap-3">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${doc?.status === 'verified' ? 'bg-green-500 text-white' : ''}
                    ${doc?.status === 'rejected' ? 'bg-destructive text-destructive-foreground' : ''}
                    ${doc?.status === 'pending' ? 'bg-yellow-500 text-white' : ''}
                    ${!doc ? 'bg-muted' : ''}
                  `}>
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : doc?.status === 'verified' ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : doc?.status === 'rejected' ? (
                      <XCircle className="h-6 w-6" />
                    ) : doc?.status === 'pending' ? (
                      <Clock className="h-6 w-6" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div>
                    <p className="font-medium text-sm">{docType.label}</p>
                    {isUploading && (
                      <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                    )}
                    {!isUploading && !doc && (
                      <p className="text-xs text-muted-foreground mt-1">Click to upload</p>
                    )}
                    {doc?.status === 'pending' && (
                      <p className="text-xs text-yellow-600 mt-1">Awaiting review</p>
                    )}
                    {doc?.status === 'verified' && (
                      <p className="text-xs text-green-600 mt-1">Verified ✓</p>
                    )}
                    {doc?.status === 'rejected' && (
                      <div className="mt-1">
                        <p className="text-xs text-destructive">Rejected</p>
                        {doc.reviewer_notes && (
                          <p className="text-xs text-muted-foreground mt-1">{doc.reviewer_notes}</p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUploadClick(docType.id);
                          }}
                        >
                          Re-upload
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
