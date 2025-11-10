import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EmailTemplatePreviewProps {
  subject: string;
  body: string;
  highlightVariables?: boolean;
}

export const EmailTemplatePreview = ({ 
  subject, 
  body, 
  highlightVariables = true 
}: EmailTemplatePreviewProps) => {
  const highlightText = (text: string) => {
    if (!highlightVariables) return text;
    
    const parts = text.split(/({{[\w]+}})/g);
    return parts.map((part, index) => {
      if (part.match(/{{[\w]+}}/)) {
        return (
          <Badge key={index} variant="secondary" className="mx-1">
            {part}
          </Badge>
        );
      }
      return part;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Preview do E-mail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Assunto
          </label>
          <div className="mt-1 p-3 bg-muted rounded-md">
            {highlightText(subject)}
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Corpo
          </label>
          <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
            {highlightText(body)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
