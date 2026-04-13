import React from 'react';
import { Button } from '@/components/ui/button';

interface ChatWidgetBoundaryProps {
  children: React.ReactNode;
}

interface ChatWidgetBoundaryState {
  hasError: boolean;
}

export class ChatWidgetBoundary extends React.Component<ChatWidgetBoundaryProps, ChatWidgetBoundaryState> {
  state: ChatWidgetBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ChatWidgetBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ChatWidgetBoundary] chat widget crashed:', error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="fixed bottom-6 right-6 z-50 rounded-xl border bg-background p-3 shadow-lg max-w-[280px]">
        <p className="text-sm font-medium">Chat indisponivel</p>
        <p className="text-xs text-muted-foreground mt-1">
          O chat encontrou um erro inesperado. Pode tentar novamente.
        </p>
        <Button size="sm" className="mt-3 w-full" onClick={this.handleRetry}>
          Recarregar chat
        </Button>
      </div>
    );
  }
}
