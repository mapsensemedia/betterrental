import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileCheck, 
  AlertCircle, 
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { useBookingVerification, useUploadVerificationDocument } from '@/hooks/use-verification';

interface VerificationUploadProps {
  bookingId: string;
}

const DOCUMENT_TYPES = [
  { id: 'drivers_license_front', label: "Driver's License (Front)", required: true },
  { id: 'drivers_license_back', label: "Driver's License (Back)", required: true },
  { id: 'proof_of_insurance', label: 'Proof of Insurance', required: false },
];

export function VerificationUpload({ bookingId }: VerificationUploadProps) {
  const { data: verifications, isLoading } = useBookingVerification(bookingId);
  const uploadMutation = useUploadVerificationDocument();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getDocStatus = (docType: string) => {
    const doc = verifications?.find(v => v.document_type === docType);
    if (!doc) return null;
    return doc;
  };

  const getOverallStatus = () => {
    const requiredDocs = DOCUMENT_TYPES.filter(d => d.required);
    const submittedRequired = requiredDocs.filter(d => {
      const doc = getDocStatus(d.id);
      return doc && doc.status !== 'rejected';
    });

    if (submittedRequired.length === 0) return 'required';
    if (submittedRequired.length < requiredDocs.length) return 'incomplete';
    
    const allVerified = submittedRequired.every(d => {
      const doc = getDocStatus(d.id);
      return doc?.status === 'verified';
    });
    
    if (allVerified) return 'verified';
    return 'pending';
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

  const overallStatus = getOverallStatus();

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
            <CardTitle className="text-lg">Verification Documents</CardTitle>
            <CardDescription>
              Upload required documents to complete your booking
            </CardDescription>
          </div>
          <Badge 
            variant={
              overallStatus === 'verified' ? 'default' :
              overallStatus === 'pending' ? 'secondary' :
              'outline'
            }
            className={
              overallStatus === 'verified' ? 'bg-green-500' :
              overallStatus === 'pending' ? 'bg-yellow-500' :
              ''
            }
          >
            {overallStatus === 'verified' && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {overallStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
            {overallStatus === 'required' && <AlertCircle className="h-3 w-3 mr-1" />}
            {overallStatus === 'incomplete' && <AlertCircle className="h-3 w-3 mr-1" />}
            {overallStatus === 'verified' ? 'Verified' :
             overallStatus === 'pending' ? 'Under Review' :
             overallStatus === 'incomplete' ? 'Incomplete' :
             'Required'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {overallStatus === 'required' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please upload the required documents to finalize your booking.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {DOCUMENT_TYPES.map((docType) => {
            const doc = getDocStatus(docType.id);
            const isUploading = uploadingType === docType.id;

            return (
              <div
                key={docType.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {doc?.status === 'verified' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : doc?.status === 'rejected' ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : doc?.status === 'pending' ? (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <FileCheck className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {docType.label}
                      {docType.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </p>
                    {doc?.status === 'rejected' && doc.reviewer_notes && (
                      <p className="text-xs text-destructive mt-1">
                        {doc.reviewer_notes}
                      </p>
                    )}
                    {doc?.status === 'pending' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted - awaiting review
                      </p>
                    )}
                    {doc?.status === 'verified' && (
                      <p className="text-xs text-green-600 mt-1">
                        Verified
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <input
                    ref={(el) => (fileInputRefs.current[docType.id] = el)}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileSelect(docType.id, file);
                      }
                      e.target.value = '';
                    }}
                  />
                  <Button
                    size="sm"
                    variant={doc ? 'outline' : 'default'}
                    onClick={() => handleUploadClick(docType.id)}
                    disabled={isUploading || doc?.status === 'verified'}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Uploading...
                      </>
                    ) : doc?.status === 'rejected' ? (
                      <>
                        <Upload className="h-4 w-4 mr-1" />
                        Re-upload
                      </>
                    ) : doc ? (
                      <>
                        <Upload className="h-4 w-4 mr-1" />
                        Replace
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
