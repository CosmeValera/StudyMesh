import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'

interface FAQDialogProps {
  open: boolean
  onClose: () => void
}

interface FAQ {
  question: string
  answer: React.ReactNode
  category: string
}

const accentText = {
  color: 'primary.main',
  fontWeight: 'bold',
}

const FAQDialog: React.FC<FAQDialogProps> = ({ open, onClose }) => {
  const faqs: FAQ[] = [
    {
      category: 'Start Here',
      question: 'What should I do first?',
      answer:
        'Start with Create Widget. Pick one concrete use case, such as an operations summary, architecture site review, lab observation log, or task tracker. Save it, then reuse it in a dashboard.',
    },
    {
      category: 'Start Here',
      question: 'What is the quick-start path?',
      answer: (
        <>
          1. Open <span style={accentText}>Create Widget</span>. 2. Build a
          focused widget for your work: operations status, site-review notes,
          lab observations, or a task board. 3. Click Save. 4. Open{' '}
          <span style={accentText}>Add Widget</span> and place the saved widget
          on a dashboard.
        </>
      ),
    },
    {
      category: 'Create Widget',
      question: 'How do I create a widget?',
      answer: (
        <>
          Click <span style={accentText}>Create Widget</span> in the top bar,
          name the widget, add building blocks to the canvas, preview it, then
          save it as a reusable widget.
        </>
      ),
    },
    {
      category: 'Create Widget',
      question: 'Which building blocks should I start with?',
      answer:
        'Start with one concrete need: a chart for trends, a status label, an image for context, or a note field for follow-up.',
    },
    {
      category: 'Create Widget',
      question: 'How do I save my widget?',
      answer:
        'Click Save in Create Widget. Saved widgets appear in Add Widget so you can reuse them in dashboards.',
    },
    {
      category: 'Dashboards',
      question: 'How do I use my saved widget in a dashboard?',
      answer: (
        <>
          Click <span style={accentText}>Add Widget</span> in the top bar, open
          your saved widgets, choose the widget you just saved, and place it in
          the current dashboard.
        </>
      ),
    },
    {
      category: 'Dashboards',
      question: 'When should I open an example dashboard?',
      answer:
        'Open an example dashboard when you want to see what a finished workspace can look like. It is inspiration, not the required first step.',
    },
    {
      category: 'Troubleshooting',
      question: "Why can't I create widgets?",
      answer:
        'Widget creation is available in Builder mode. Switch to a builder account to design, save, and manage reusable widgets.',
    },
    {
      category: 'Troubleshooting',
      question: "My changes aren't saving. What should I do?",
      answer:
        'Click Save after editing a widget or dashboard. Changes are only stored when you explicitly save them.',
    },
    {
      category: 'Troubleshooting',
      question: 'Can I update a widget later?',
      answer:
        'Yes. Open Add Widget, go to your saved widgets, choose the widget, and edit it.',
    },
  ]

  const categories = Array.from(new Set(faqs.map((faq) => faq.category)))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box display="flex" alignItems="center">
          <QuestionAnswerIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography
            variant="h6"
            component="div"
            fontWeight="bold"
            color="text.primary"
          >
            Quick Start FAQ
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="close"
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: 'background.paper' }}>
        <Typography
          variant="body1"
          color="text.secondary"
          paragraph
          sx={{ mt: 2 }}
        >
          Quick answers for creating a reusable widget and placing it on a
          dashboard.
        </Typography>

        {categories.map((category, index) => (
          <Box key={category} sx={{ mt: index > 0 ? 3 : 0 }}>
            <Typography
              variant="h6"
              color="text.primary"
              sx={{
                mb: 1,
                pb: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              {category}
            </Typography>

            {faqs
              .filter((faq) => faq.category === category)
              .map((faq, i) => (
                <Accordion
                  key={i}
                  sx={{
                    mb: 1,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&.Mui-expanded': {
                      margin: '0 0 8px 0',
                    },
                    '&:before': {
                      display: 'none',
                    },
                    borderLeft: '3px solid',
                    borderLeftColor: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <ExpandMoreIcon sx={{ color: 'text.secondary' }} />
                    }
                    aria-controls={`panel${i}-content`}
                    id={`panel${i}-header`}
                  >
                    <Typography fontWeight="medium">{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Divider sx={{ borderColor: 'divider', mb: 1.5 }} />
                    <Typography color="text.secondary">{faq.answer}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, bgcolor: 'background.paper' }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: 'primary.light',
            color: '#191919',
            '&:hover': {
              bgcolor: 'primary.main',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default FAQDialog
