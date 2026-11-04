import 'dotenv/config'
// seed.ts — populates the database with the full emotions catalogue
// Data sources:
//   - Feelings Wheel "Name it to Tame it" (Willene Freddy) — wheel vocabulary
//   - DBT Handout 6 (Linehan, 2015) — 6-dimension depth per emotion
//   - DBT Handout 4a — emotion myths
//   - DBT Handouts 10/11 — opposite actions and coping suggestions
import { PrismaClient, Level, Ring, Dimension, CopingCategory } from '@prisma/client'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function upsertEmotion(data: {
  key: string
  label: string
  definition: string
  parentKey?: string
  ring: Ring
  sectorColour: string
  levelMin: Level
  source: string
}) {
  return prisma.emotion.upsert({
    where: { key: data.key },
    update: data,
    create: data,
  })
}

async function seedDimensions(
  emotionKey: string,
  dimension: Dimension,
  items: string[],
  levelMin: Level = 'adult',
  source = 'dbt-handout-6'
) {
  // Delete existing rows for this emotion+dimension combo first to allow re-seeding
  await prisma.emotionDimension.deleteMany({ where: { emotionKey, dimension } })
  await prisma.emotionDimension.createMany({
    data: items.map((content, i) => ({
      emotionKey,
      dimension,
      content,
      levelMin,
      source,
      displayOrder: i,
    })),
  })
}

async function seedCoping(
  emotionKey: string | null,
  items: { suggestion: string; category: CopingCategory; levelMin: Level }[],
  source: string
) {
  if (emotionKey) {
    await prisma.copingSuggestion.deleteMany({ where: { emotionKey } })
  }
  await prisma.copingSuggestion.createMany({
    data: items.map((item) => ({
      ...item,
      emotionKey: emotionKey ?? undefined,
      source,
    })),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE EMOTIONS — innermost ring
// Colours from the "Name it to Tame it" master wheel
// ─────────────────────────────────────────────────────────────────────────────

const coreEmotions = [
  { key: 'happy',     label: 'Happy',     colour: '#F5C842', definition: 'A positive emotional state of wellbeing and contentment, ranging from mild pleasure to intense joy.' },
  { key: 'calm',      label: 'Calm',      colour: '#A8D5A2', definition: 'A state of inner stillness, safety, and ease; free from agitation, threat, or urgency.' },
  { key: 'sad',       label: 'Sad',       colour: '#6BAED6', definition: 'A feeling of sorrow, unhappiness, or grief, often arising from loss, disappointment, or unmet needs.' },
  { key: 'angry',     label: 'Angry',     colour: '#E05C5C', definition: 'A strong feeling of displeasure or hostility, often arising when something important is blocked or threatened.' },
  { key: 'disgusted', label: 'Disgusted', colour: '#74C476', definition: 'A feeling of strong revulsion or disapproval, whether physical or moral in nature.' },
  { key: 'bad',       label: 'Bad',       colour: '#9E9AC8', definition: 'A general sense of feeling off, drained, or not right — not yet pinned down to a more specific emotion.' },
  { key: 'surprised', label: 'Surprised', colour: '#FD8D3C', definition: 'A brief emotional response to something unexpected, which can be positive, negative, or neutral.' },
  { key: 'fearful',   label: 'Fearful',   colour: '#FDAE6B', definition: 'A feeling of anxiety or apprehension about a perceived threat to safety, wellbeing, or self.' },
  { key: 'shame',    label: 'Shame',    colour: '#C7B99A', definition: 'A painful feeling of humiliation or distress caused by awareness of wrong or foolish behaviour, or of being judged negatively by others.' },
  { key: 'guilt',    label: 'Guilt',    colour: '#B5CFD8', definition: 'A feeling of responsibility or remorse for a perceived offence, real or imagined, especially a moral one.' },
  { key: 'love',     label: 'Love',     colour: '#F4A7B9', definition: 'An intense feeling of deep affection, caring, or attraction toward a person, place, or thing.' },
  { key: 'envy',     label: 'Envy',     colour: '#8DB4C4', definition: 'A painful longing for what someone else has — their possessions, qualities, or situation — often mixed with resentment.' },
  { key: 'jealousy', label: 'Jealousy', colour: '#B09CC4', definition: 'A fear of losing something or someone important to a rival; a mix of anxiety, threat, and possessiveness.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// MID-RING EMOTIONS — one level deeper
// ─────────────────────────────────────────────────────────────────────────────

const midEmotions = [
  // HAPPY sector — 6 mids; peaceful and trusting moved to CALM
  { key: 'playful',    label: 'Playful',    parent: 'happy',     colour: '#F5C842', def: 'A light, fun, and carefree energy; enjoying activity for its own sake.' },
  { key: 'content',    label: 'Content',    parent: 'happy',     colour: '#F5C842', def: 'A quiet, settled sense of satisfaction with how things are right now.' },
  { key: 'interested', label: 'Interested', parent: 'happy',     colour: '#F5C842', def: 'Engaged, curious, and drawn toward something or someone.' },
  { key: 'proud',      label: 'Proud',      parent: 'happy',     colour: '#F5C842', def: 'A sense of satisfaction from your own or others\' achievements.' },
  { key: 'accepted',   label: 'Accepted',   parent: 'happy',     colour: '#F5C842', def: 'Feeling welcomed, included, and valued by others.' },
  { key: 'powerful',   label: 'Powerful',   parent: 'happy',     colour: '#F5C842', def: 'A sense of strength, capability, and being in control of yourself and your situation.' },
  // CALM sector — peaceful and trusting moved here from Happy; two new mids added
  { key: 'peaceful',   label: 'Peaceful',   parent: 'calm',      colour: '#A8D5A2', def: 'Calm, quiet, and free from inner conflict or disturbance.' },
  { key: 'trusting',   label: 'Trusting',   parent: 'calm',      colour: '#A8D5A2', def: 'A feeling of safety and confidence in others or in situations.' },
  { key: 'relaxed',    label: 'Relaxed',    parent: 'calm',      colour: '#A8D5A2', def: 'Tension has released; the body and mind are at ease without effort.' },
  { key: 'centred',    label: 'Centred',    parent: 'calm',      colour: '#A8D5A2', def: 'Grounded and balanced; fully present without being pulled by worry or distraction.' },
  // SAD sector
  { key: 'lonely',       label: 'Lonely',       parent: 'sad',  colour: '#6BAED6', def: 'Feeling isolated, disconnected, or separated from others.' },
  { key: 'vulnerable',   label: 'Vulnerable',   parent: 'sad',  colour: '#6BAED6', def: 'Feeling exposed, fragile, and at risk of being hurt.' },
  { key: 'despair',      label: 'Despair',      parent: 'sad',  colour: '#6BAED6', def: 'A complete loss of hope; a feeling that things cannot improve.' },
  { key: 'guilty-sad',   label: 'Guilty',       parent: 'sad',  colour: '#6BAED6', def: 'A sense of having done something wrong that weighs heavily on you.' },
  { key: 'depressed',    label: 'Depressed',    parent: 'sad',  colour: '#6BAED6', def: 'Persistent feelings of sadness, emptiness, and loss of interest in things that used to matter.' },
  { key: 'hurt',         label: 'Hurt',         parent: 'sad',  colour: '#6BAED6', def: 'An emotional pain caused by something done or said by others.' },
  // ANGRY sector
  { key: 'let-down',    label: 'Let Down',    parent: 'angry', colour: '#E05C5C', def: 'Disappointed because expectations or trust were not met.' },
  { key: 'humiliated',  label: 'Humiliated',  parent: 'angry', colour: '#E05C5C', def: 'Made to feel ashamed or foolish, especially in front of others.' },
  { key: 'bitter',      label: 'Bitter',      parent: 'angry', colour: '#E05C5C', def: 'A lingering anger or resentment from a past injustice or disappointment.' },
  { key: 'mad',         label: 'Mad',         parent: 'angry', colour: '#E05C5C', def: 'Intense anger; feeling out of control with rage.' },
  { key: 'aggressive',  label: 'Aggressive',  parent: 'angry', colour: '#E05C5C', def: 'A forceful, hostile energy directed outward.' },
  { key: 'frustrated',  label: 'Frustrated',  parent: 'angry', colour: '#E05C5C', def: 'The feeling of being blocked, thwarted, or unable to achieve what you want.' },
  { key: 'distant',     label: 'Distant',     parent: 'angry', colour: '#E05C5C', def: 'Withdrawn from others; creating space as a response to anger or hurt.' },
  { key: 'critical',    label: 'Critical',    parent: 'angry', colour: '#E05C5C', def: 'Finding fault; a negative evaluative lens directed at self or others.' },
  // DISGUSTED sector
  { key: 'disapproving',   label: 'Disapproving',   parent: 'disgusted', colour: '#74C476', def: 'Holding a negative moral or aesthetic judgment about something.' },
  { key: 'awful',          label: 'Awful',          parent: 'disgusted', colour: '#74C476', def: 'An overwhelming sense that something is deeply wrong or terrible.' },
  { key: 'repelled',       label: 'Repelled',       parent: 'disgusted', colour: '#74C476', def: 'Pushed away by strong revulsion, physically or emotionally.' },
  { key: 'uncomfortable',  label: 'Uncomfortable',  parent: 'disgusted', colour: '#74C476', def: 'Unease; something feels off or not right but not fully identified yet.' },
  // BAD sector
  { key: 'bored',     label: 'Bored',     parent: 'bad', colour: '#9E9AC8', def: 'Restless and lacking stimulation; nothing feels interesting or worth engaging with.' },
  { key: 'tired',     label: 'Tired',     parent: 'bad', colour: '#9E9AC8', def: 'Depleted of energy; needing rest.' },
  { key: 'stressed',  label: 'Stressed',  parent: 'bad', colour: '#9E9AC8', def: 'Feeling overwhelmed by demands, pressure, or uncertainty.' },
  { key: 'confused',  label: 'Confused',  parent: 'bad', colour: '#9E9AC8', def: 'Unable to think clearly; uncertain about what is happening or what to do.' },
  // SURPRISED sector
  { key: 'startled',  label: 'Startled',  parent: 'surprised', colour: '#FD8D3C', def: 'A sudden shock from an unexpected event.' },
  { key: 'amazed',    label: 'Amazed',    parent: 'surprised', colour: '#FD8D3C', def: 'Struck with wonder or astonishment.' },
  { key: 'excited',   label: 'Excited',   parent: 'surprised', colour: '#FD8D3C', def: 'Energised and eager anticipation; a positive high arousal state.' },
  { key: 'eager',     label: 'Eager',     parent: 'surprised', colour: '#FD8D3C', def: 'Keen and ready to begin; enthusiastic anticipation.' },
  // FEARFUL sector
  { key: 'scared',      label: 'Scared',      parent: 'fearful', colour: '#FDAE6B', def: 'Afraid of something specific that feels threatening.' },
  { key: 'anxious',     label: 'Anxious',     parent: 'fearful', colour: '#FDAE6B', def: 'Worried and uneasy, often about something uncertain or in the future.' },
  { key: 'insecure',    label: 'Insecure',    parent: 'fearful', colour: '#FDAE6B', def: 'Uncertain about yourself; lacking confidence or a sense of safety.' },
  { key: 'weak',        label: 'Weak',        parent: 'fearful', colour: '#FDAE6B', def: 'Feeling powerless, fragile, or unable to cope with demands.' },
  { key: 'rejected',    label: 'Rejected',    parent: 'fearful', colour: '#FDAE6B', def: 'Feeling excluded, dismissed, or unwanted by others.' },
  { key: 'threatened',  label: 'Threatened',  parent: 'fearful', colour: '#FDAE6B', def: 'Sensing danger to your safety, relationships, or sense of self.' },
  // ── LOVE sector — DBT Handout 6 + Willene wheel (included/accepted/trusted/close/cared for)
  // Merged into 4 mid themes: Caring (nurturing others), Romantic (attraction/passion),
  // Tender (warmth/closeness), Grateful (appreciation/thankfulness).
  { key: 'love-caring',   label: 'Caring',    parent: 'love', colour: '#F4A7B9', def: 'Actively attending to the needs and wellbeing of others.' },
  { key: 'love-romantic', label: 'Romantic',  parent: 'love', colour: '#F4A7B9', def: 'Feeling attraction, desire, and deep connection with another person.' },
  { key: 'love-tender',   label: 'Tender',    parent: 'love', colour: '#F4A7B9', def: 'Soft warmth and gentleness toward someone; a quiet affection.' },
  { key: 'love-grateful', label: 'Grateful',  parent: 'love', colour: '#F4A7B9', def: 'Deeply thankful for what someone gives or means to you.' },
  // ── GUILT sector — DBT Handout 6 + Willene wheel (sorry/regretful/ashamed/embarrassed/awkward)
  // Merged into 4 mid themes: Remorseful (deep regret for harm done), Regretful (wishing
  // things were different), Apologetic (wanting to make amends), Self-Blaming (holding
  // yourself responsible).
  { key: 'guilt-remorseful',   label: 'Remorseful',   parent: 'guilt', colour: '#B5CFD8', def: 'Deeply sorry for harm or hurt you have caused to others.' },
  { key: 'guilt-regretful',    label: 'Regretful',    parent: 'guilt', colour: '#B5CFD8', def: 'Wishing you had done something differently; mourning a past choice.' },
  { key: 'guilt-apologetic',   label: 'Apologetic',   parent: 'guilt', colour: '#B5CFD8', def: 'Wanting to acknowledge wrongdoing and make things right.' },
  { key: 'guilt-self-blaming', label: 'Self-Blaming', parent: 'guilt', colour: '#B5CFD8', def: 'Holding yourself responsible for a negative outcome or someone\'s pain.' },
  // ── SHAME sector — DBT Handout 6 words: embarrassment, mortification, humiliation,
  // self-conscious, culpability, contrition, discomposure, shyness.
  // Merged into 4 mid themes: Humiliated (others made you feel small), Embarrassed
  // (exposed to others), Exposed (your flaws or secrets are visible), Unworthy (deep
  // belief that you are not enough or defective).
  { key: 'shame-humiliated', label: 'Humiliated', parent: 'shame', colour: '#C7B99A', def: 'Made to feel worthless or small, especially by others\' actions or words.' },
  { key: 'shame-embarrassed', label: 'Embarrassed', parent: 'shame', colour: '#C7B99A', def: 'Self-conscious discomfort from being seen doing something wrong or foolish.' },
  { key: 'shame-exposed',    label: 'Exposed',    parent: 'shame', colour: '#C7B99A', def: 'A private part of yourself — a flaw, secret, or failure — has been made visible.' },
  { key: 'shame-unworthy',   label: 'Unworthy',   parent: 'shame', colour: '#C7B99A', def: 'A deep sense of not being good enough; believing you are fundamentally flawed.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// OUTER (SPECIFIC) EMOTIONS
// ─────────────────────────────────────────────────────────────────────────────

const specificEmotions = [
  // playful
  { key: 'aroused',    label: 'Aroused',    parent: 'playful',   colour: '#F5C842', def: 'Heightened energy and interest; stimulated and engaged.' },
  { key: 'cheeky',     label: 'Cheeky',     parent: 'playful',   colour: '#F5C842', def: 'Playfully irreverent; enjoying mild mischief.' },
  { key: 'free',       label: 'Free',       parent: 'playful',   colour: '#F5C842', def: 'Unencumbered and unrestrained; able to be yourself without constraint.' },
  { key: 'joyful',     label: 'Joyful',     parent: 'playful',   colour: '#F5C842', def: 'A deep, upwelling of delight and happiness.' },
  // content — SocialWorkersToolbox adds "pleased", "satisfied", "fulfilled"
  { key: 'curious',    label: 'Curious',     parent: 'content',  colour: '#F5C842', def: 'Eager to explore, learn, and understand.' },
  { key: 'inquisitive',label: 'Inquisitive', parent: 'content',  colour: '#F5C842', def: 'Actively seeking information and deeper understanding.' },
  { key: 'successful', label: 'Successful',  parent: 'content',  colour: '#F5C842', def: 'Having achieved a goal or met a standard that matters to you.' },
  { key: 'confident',  label: 'Confident',   parent: 'content',  colour: '#F5C842', def: 'A quiet assurance in yourself and your abilities.' },
  { key: 'pleased',    label: 'Pleased',     parent: 'content',  colour: '#F5C842', def: 'Mildly happy about how something turned out; a light, quiet satisfaction.' },
  { key: 'satisfied',  label: 'Satisfied',   parent: 'content',  colour: '#F5C842', def: 'A sense of fulfilment; what you needed or wanted has been met.' },
  { key: 'fulfilled',  label: 'Fulfilled',   parent: 'content',  colour: '#F5C842', def: 'A deep sense of meaning and completeness; living in line with what matters to you.' },
  // interested
  { key: 'respected',  label: 'Respected',  parent: 'interested', colour: '#F5C842', def: 'Feeling valued, acknowledged, and held in esteem by others.' },
  { key: 'valued',     label: 'Valued',     parent: 'interested', colour: '#F5C842', def: 'Feeling that your contributions and presence matter to others.' },
  // proud — SocialWorkersToolbox: "proud", "capable", "brave" appear in the happy sector
  { key: 'proud-of',    label: 'Proud Of',    parent: 'proud',  colour: '#F5C842', def: 'Satisfaction from recognising what you or someone close to you has achieved.' },
  { key: 'accomplished',label: 'Accomplished',parent: 'proud',  colour: '#F5C842', def: 'Having done something well; a clean, earned sense of completion.' },
  { key: 'worthy',      label: 'Worthy',      parent: 'proud',  colour: '#F5C842', def: 'Feeling deserving of good things; a quiet confidence in your own value.' },
  { key: 'dignified',   label: 'Dignified',   parent: 'proud',  colour: '#F5C842', def: 'Carrying yourself with self-respect and a sense of personal honour.' },
  // accepted — SocialWorkersToolbox: "loved", "included", "connected"
  { key: 'loved',       label: 'Loved',       parent: 'accepted', colour: '#F5C842', def: 'Feeling that others hold you with care, affection, and regard.' },
  { key: 'included',    label: 'Included',    parent: 'accepted', colour: '#F5C842', def: 'Part of something; belonging to a group or community that wants you there.' },
  { key: 'connected',   label: 'Connected',   parent: 'accepted', colour: '#F5C842', def: 'A felt sense of being in genuine relationship; not alone.' },
  { key: 'belonging',   label: 'Belonging',   parent: 'accepted', colour: '#F5C842', def: 'A deep sense of fitting in; being at home with people or a place.' },
  // powerful — SocialWorkersToolbox adds "capable" and "brave" here
  { key: 'courageous', label: 'Courageous', parent: 'powerful',  colour: '#F5C842', def: 'Able to face fear, pain, or difficulty with resolve.' },
  { key: 'creative',   label: 'Creative',   parent: 'powerful',  colour: '#F5C842', def: 'In touch with your imaginative and expressive capacities.' },
  { key: 'capable',    label: 'Capable',    parent: 'powerful',  colour: '#F5C842', def: 'Feeling able and equipped to do what is asked or needed of you.' },
  { key: 'brave',      label: 'Brave',      parent: 'powerful',  colour: '#F5C842', def: 'Willing to face something difficult or frightening with courage.' },
  // peaceful (CALM sector) — colour now sage green
  { key: 'loving',       label: 'Loving',       parent: 'peaceful',  colour: '#A8D5A2', def: 'Warm, caring, and connected; feeling affection for others.' },
  { key: 'thankful',     label: 'Thankful',     parent: 'peaceful',  colour: '#A8D5A2', def: 'A warm appreciation for what you have and what others do.' },
  { key: 'sensitive',    label: 'Sensitive',    parent: 'peaceful',  colour: '#A8D5A2', def: 'Finely attuned to emotions, beauty, or the feelings of others.' },
  { key: 'intimate',     label: 'Intimate',     parent: 'peaceful',  colour: '#A8D5A2', def: 'A close, deeply personal connection with another person.' },
  { key: 'serene',       label: 'Serene',       parent: 'peaceful',  colour: '#A8D5A2', def: 'Completely calm and undisturbed; a deep, settled inner stillness.' },
  { key: 'comfortable',  label: 'Comfortable',  parent: 'peaceful',  colour: '#A8D5A2', def: 'At ease in your body and surroundings; nothing feels like a threat.' },
  // trusting (CALM sector) — colour now sage green
  { key: 'hopeful',    label: 'Hopeful',    parent: 'trusting',  colour: '#A8D5A2', def: 'Expecting good things to happen; a positive orientation toward the future.' },
  { key: 'inspired',   label: 'Inspired',   parent: 'trusting',  colour: '#A8D5A2', def: 'Uplifted and motivated by an idea, person, or experience.' },
  { key: 'secure',     label: 'Secure',     parent: 'trusting',  colour: '#A8D5A2', def: 'Feeling safe, stable, and free from fear about what is coming.' },
  { key: 'reassured',  label: 'Reassured',  parent: 'trusting',  colour: '#A8D5A2', def: 'Worry has been eased by someone\'s words, actions, or presence.' },
  { key: 'close',      label: 'Close',      parent: 'trusting',  colour: '#A8D5A2', def: 'A feeling of nearness and openness with someone; emotional intimacy built on trust.' },
  // relaxed (CALM sector) — SocialWorkersToolbox CALM words: relaxed, settled, at ease, steady, balanced
  { key: 'settled',    label: 'Settled',    parent: 'relaxed',   colour: '#A8D5A2', def: 'Feeling stable and at rest; nothing pulling you out of balance.' },
  { key: 'at-ease',    label: 'At Ease',    parent: 'relaxed',   colour: '#A8D5A2', def: 'Comfortable and free from worry; a soft readiness without tension.' },
  { key: 'steady',     label: 'Steady',     parent: 'relaxed',   colour: '#A8D5A2', def: 'Consistent and grounded; not easily shaken by what is happening around you.' },
  { key: 'balanced',   label: 'Balanced',   parent: 'relaxed',   colour: '#A8D5A2', def: 'A sense of equilibrium across different parts of life; nothing feels excessive.' },
  // centred (CALM sector) — SocialWorkersToolbox CALM words: present, centred, refreshed, restored, recharged
  { key: 'present',    label: 'Present',    parent: 'centred',   colour: '#A8D5A2', def: 'Fully here, in this moment; not pulled into the past or the future.' },
  { key: 'refreshed',  label: 'Refreshed',  parent: 'centred',   colour: '#A8D5A2', def: 'Energy and clarity restored; as if a fog has lifted.' },
  { key: 'restored',   label: 'Restored',   parent: 'centred',   colour: '#A8D5A2', def: 'Renewed after depletion; inner resources have been replenished.' },
  { key: 'recharged',  label: 'Recharged',  parent: 'centred',   colour: '#A8D5A2', def: 'Full of energy again after rest; ready to re-engage with the world.' },
  // lonely — SocialWorkersToolbox adds "left out", "unwanted", "disconnected"
  { key: 'isolated',      label: 'Isolated',      parent: 'lonely',    colour: '#6BAED6', def: 'Cut off from others; feeling alone even when people are present.' },
  { key: 'abandoned',     label: 'Abandoned',     parent: 'lonely',    colour: '#6BAED6', def: 'Feeling left behind, deserted, or let go of by someone important.' },
  { key: 'left-out',      label: 'Left Out',      parent: 'lonely',    colour: '#6BAED6', def: 'Excluded when others are included; the sting of not being chosen.' },
  { key: 'disconnected',  label: 'Disconnected',  parent: 'lonely',    colour: '#6BAED6', def: 'Feeling cut off from others even when physically near them.' },
  // vulnerable
  { key: 'victimised', label: 'Victimised', parent: 'vulnerable', colour: '#6BAED6', def: 'Feeling targeted, treated unfairly, or powerless against others\' actions.' },
  { key: 'fragile',    label: 'Fragile',    parent: 'vulnerable', colour: '#6BAED6', def: 'Feeling delicate and easily broken; needing care and protection.' },
  // despair — SocialWorkersToolbox adds "miserable", "hopeless"
  { key: 'grief',      label: 'Grief',      parent: 'despair',   colour: '#6BAED6', def: 'Deep sorrow especially caused by someone\'s death or a significant loss.' },
  { key: 'powerless',  label: 'Powerless',  parent: 'despair',   colour: '#6BAED6', def: 'Feeling unable to change your situation or influence what happens next.' },
  { key: 'miserable',  label: 'Miserable',  parent: 'despair',   colour: '#6BAED6', def: 'Deeply unhappy and uncomfortable; life feels bleak and unpleasant.' },
  { key: 'hopeless',   label: 'Hopeless',   parent: 'despair',   colour: '#6BAED6', def: 'Believing things cannot improve; the future feels closed off.' },
  // depressed
  { key: 'ashamed',    label: 'Ashamed',    parent: 'depressed', colour: '#6BAED6', def: 'A painful awareness of having done something wrong or being fundamentally flawed.' },
  { key: 'remorseful', label: 'Remorseful', parent: 'depressed', colour: '#6BAED6', def: 'Deep regret over a past action or harm caused to others.' },
  // hurt — SocialWorkersToolbox adds "heartbroken", "unwanted"
  { key: 'disappointed',  label: 'Disappointed',  parent: 'hurt',  colour: '#6BAED6', def: 'Sad because something did not turn out as hoped or expected.' },
  { key: 'empty',         label: 'Empty',         parent: 'hurt',  colour: '#6BAED6', def: 'A hollow absence of feeling; a numbness where emotion should be.' },
  { key: 'heartbroken',   label: 'Heartbroken',   parent: 'hurt',  colour: '#6BAED6', def: 'Overwhelmed by grief or sadness, especially from a loss in a close relationship.' },
  { key: 'unwanted',      label: 'Unwanted',      parent: 'hurt',  colour: '#6BAED6', def: 'Feeling as though nobody wants you around or that you do not belong.' },
  // let-down
  { key: 'betrayed',   label: 'Betrayed',   parent: 'let-down',  colour: '#E05C5C', def: 'Feeling deceived or let down by someone you trusted.' },
  { key: 'resentful',  label: 'Resentful',  parent: 'let-down',  colour: '#E05C5C', def: 'Bitter indignation from being treated unfairly over time.' },
  // humiliated
  { key: 'disrespected', label: 'Disrespected', parent: 'humiliated', colour: '#E05C5C', def: 'Feeling belittled or treated without regard for your worth or dignity.' },
  { key: 'ridiculed',    label: 'Ridiculed',    parent: 'humiliated', colour: '#E05C5C', def: 'Mocked or made to feel foolish in front of others.' },
  // bitter — SocialWorkersToolbox adds "wronged"
  { key: 'indignant',  label: 'Indignant',  parent: 'bitter',    colour: '#E05C5C', def: 'Anger sparked by a perceived injustice or unfair treatment.' },
  { key: 'violated',   label: 'Violated',   parent: 'bitter',    colour: '#E05C5C', def: 'A sense that your boundaries, rights, or dignity have been breached.' },
  { key: 'wronged',    label: 'Wronged',    parent: 'bitter',    colour: '#E05C5C', def: 'Feeling that you have been treated unjustly and that the injustice has not been acknowledged.' },
  // mad — DBT anger words add "outrage", "wrath"
  { key: 'furious',    label: 'Furious',    parent: 'mad',       colour: '#E05C5C', def: 'Extremely angry; rage that is difficult to contain.' },
  { key: 'jealous',    label: 'Jealous',    parent: 'mad',       colour: '#E05C5C', def: 'Fear of losing something or someone important to a rival.' },
  { key: 'outraged',   label: 'Outraged',   parent: 'mad',       colour: '#E05C5C', def: 'Shocked and angry at something that feels deeply unjust or wrong.' },
  { key: 'wrathful',   label: 'Wrathful',   parent: 'mad',       colour: '#E05C5C', def: 'Intense, deep-seated anger that demands acknowledgement or action.' },
  // aggressive — DBT anger words add "ferocious", "vengeful"
  { key: 'provoked',   label: 'Provoked',   parent: 'aggressive', colour: '#E05C5C', def: 'Deliberately stirred up; pushed toward an angry reaction.' },
  { key: 'hostile',    label: 'Hostile',    parent: 'aggressive', colour: '#E05C5C', def: 'Actively unfriendly and antagonistic; ready to oppose.' },
  { key: 'ferocious',  label: 'Ferocious',  parent: 'aggressive', colour: '#E05C5C', def: 'Savagely intense anger; an overwhelming urge to lash out.' },
  // frustrated — DBT anger words add "exasperated", "wound up" (widely used in Irish/UK wheels)
  { key: 'infuriated', label: 'Infuriated', parent: 'frustrated', colour: '#E05C5C', def: 'Extremely frustrated; anger intensified by repeated obstacles.' },
  { key: 'annoyed',    label: 'Annoyed',    parent: 'frustrated', colour: '#E05C5C', def: 'Mildly irritated by something persistent or trivial.' },
  { key: 'wound-up',   label: 'Wound Up',   parent: 'frustrated', colour: '#E05C5C', def: 'Tense and agitated, unable to settle; tight with frustration or stress.' },
  { key: 'exasperated',label: 'Exasperated',parent: 'frustrated', colour: '#E05C5C', def: 'Irritated and worn down; pushed to the limit of your patience.' },
  // distant
  { key: 'withdrawn',  label: 'Withdrawn',  parent: 'distant',   colour: '#E05C5C', def: 'Pulled back from engagement; emotionally or physically retreating.' },
  { key: 'numb',       label: 'Numb',       parent: 'distant',   colour: '#E05C5C', def: 'Unable to feel; emotions have shut down as a protective response.' },
  // disapproving — SocialWorkersToolbox adds "offended"; DBT disgust adds "contempt"
  { key: 'judgmental',  label: 'Judgmental',  parent: 'disapproving', colour: '#74C476', def: 'Critically assessing others based on your own standards.' },
  { key: 'dismissive',  label: 'Dismissive',  parent: 'disapproving', colour: '#74C476', def: 'Treating something as unworthy of serious consideration.' },
  { key: 'offended',    label: 'Offended',    parent: 'disapproving', colour: '#74C476', def: 'Feeling insulted or wronged; your sense of what is right has been violated.' },
  { key: 'contemptuous',label: 'Contemptuous',parent: 'disapproving', colour: '#74C476', def: 'Regarding something as worthless or beneath consideration; disdain.' },
  // awful — SocialWorkersToolbox adds "disturbed"
  { key: 'embarrassed',  label: 'Embarrassed',  parent: 'awful', colour: '#74C476', def: 'Self-conscious discomfort caused by a social misstep or exposure.' },
  { key: 'appalled',     label: 'Appalled',     parent: 'awful', colour: '#74C476', def: 'Shocked and horrified by something morally unacceptable.' },
  { key: 'disturbed',    label: 'Disturbed',    parent: 'awful', colour: '#74C476', def: 'Unsettled and troubled; something has shaken your sense of how things should be.' },
  // repelled
  { key: 'revolted',    label: 'Revolted',    parent: 'repelled', colour: '#74C476', def: 'Physically or emotionally sickened by something.' },
  { key: 'detestable',  label: 'Detestable',  parent: 'repelled', colour: '#74C476', def: 'Finding something intensely hateful or worthy of contempt.' },
  // uncomfortable
  { key: 'hesitant',   label: 'Hesitant',   parent: 'uncomfortable', colour: '#74C476', def: 'Tentative and uncertain; holding back from action.' },
  { key: 'unsettled',  label: 'Unsettled',  parent: 'uncomfortable', colour: '#74C476', def: 'Uneasy; lacking a sense of stability or certainty.' },
  // bored
  { key: 'apathetic',  label: 'Apathetic',  parent: 'bored',    colour: '#9E9AC8', def: 'Lacking energy, motivation, or interest in anything.' },
  { key: 'indifferent',label: 'Indifferent',parent: 'bored',    colour: '#9E9AC8', def: 'Neither positive nor negative; no particular feeling either way.' },
  // tired
  { key: 'sleepy',     label: 'Sleepy',     parent: 'tired',    colour: '#9E9AC8', def: 'Drowsy and in need of rest or sleep.' },
  { key: 'unfocused',  label: 'Unfocused',  parent: 'tired',    colour: '#9E9AC8', def: 'Unable to concentrate; mind drifting away from the task at hand.' },
  // stressed
  { key: 'overwhelmed',  label: 'Overwhelmed',  parent: 'stressed', colour: '#9E9AC8', def: 'So much is happening that you cannot process or cope with it all.' },
  { key: 'out-of-control',label: 'Out of Control', parent: 'stressed', colour: '#9E9AC8', def: 'Feeling that events or emotions are beyond your ability to manage.' },
  // confused — SocialWorkersToolbox adds "mixed up", "lost", "unclear"
  { key: 'disillusioned', label: 'Disillusioned', parent: 'confused', colour: '#9E9AC8', def: 'Disappointed after discovering something is not as good as believed.' },
  { key: 'perplexed',     label: 'Perplexed',     parent: 'confused', colour: '#9E9AC8', def: 'Deeply puzzled; unable to make sense of a situation.' },
  { key: 'mixed-up',      label: 'Mixed Up',       parent: 'confused', colour: '#9E9AC8', def: 'Confused about your own feelings or a situation; things feel tangled.' },
  { key: 'lost',          label: 'Lost',           parent: 'confused', colour: '#9E9AC8', def: 'Without direction or clarity; unsure which way to turn emotionally or practically.' },
  // startled — SocialWorkersToolbox adds "alarmed", "stunned", "shaken"
  { key: 'shocked',    label: 'Shocked',    parent: 'startled',  colour: '#FD8D3C', def: 'A sudden disturbance of composure from something unexpected.' },
  { key: 'dismayed',   label: 'Dismayed',   parent: 'startled',  colour: '#FD8D3C', def: 'Concern and distress caused by something surprising and unwelcome.' },
  { key: 'alarmed',    label: 'Alarmed',    parent: 'startled',  colour: '#FD8D3C', def: 'A sudden spike of worry or fear triggered by an unexpected event or threat.' },
  { key: 'stunned',    label: 'Stunned',    parent: 'startled',  colour: '#FD8D3C', def: 'So surprised you can barely react; momentarily unable to think or move.' },
  { key: 'shaken',     label: 'Shaken',     parent: 'startled',  colour: '#FD8D3C', def: 'Unsettled after a shock; the body and mind still trembling from the impact.' },
  // amazed — SocialWorkersToolbox adds "impressed", "fascinated"
  { key: 'astonished', label: 'Astonished', parent: 'amazed',    colour: '#FD8D3C', def: 'Greatly surprised, to the point of being almost unable to believe it.' },
  { key: 'awestruck',  label: 'Awestruck',  parent: 'amazed',    colour: '#FD8D3C', def: 'Overwhelmed by wonder and reverence.' },
  { key: 'impressed',  label: 'Impressed',  parent: 'amazed',    colour: '#FD8D3C', def: 'Struck favourably by something; admiration mixed with surprise.' },
  { key: 'fascinated', label: 'Fascinated', parent: 'amazed',    colour: '#FD8D3C', def: 'Drawn in with strong interest; held captive by something intriguing.' },
  // scared — DBT fear words add "panicked", "dread"
  { key: 'helpless',   label: 'Helpless',   parent: 'scared',    colour: '#FDAE6B', def: 'Unable to act or protect yourself; dependent on others.' },
  { key: 'frightened', label: 'Frightened', parent: 'scared',    colour: '#FDAE6B', def: 'Afraid; a direct response to a perceived threat.' },
  { key: 'panicked',   label: 'Panicked',   parent: 'scared',    colour: '#FDAE6B', def: 'Fear has overtaken rational thought; the body is in full fight-or-flight.' },
  { key: 'dread',      label: 'Dread',      parent: 'scared',    colour: '#FDAE6B', def: 'A heavy, anticipatory fear about something that may be coming.' },
  // anxious — SocialWorkersToolbox/Basic add "nervous", "on edge", "tense"
  { key: 'overwhelmed-anx', label: 'Overwhelmed', parent: 'anxious', colour: '#FDAE6B', def: 'Flooded with worry or anxiety to the point of feeling paralysed.' },
  { key: 'worried',    label: 'Worried',    parent: 'anxious',   colour: '#FDAE6B', def: 'Troubled by thoughts about something that might go wrong.' },
  { key: 'nervous',    label: 'Nervous',    parent: 'anxious',   colour: '#FDAE6B', def: 'Jittery and on edge, especially before something important or unknown.' },
  { key: 'on-edge',    label: 'On Edge',    parent: 'anxious',   colour: '#FDAE6B', def: 'Tense and alert; a low-level readiness for something to go wrong.' },
  { key: 'tense',      label: 'Tense',      parent: 'anxious',   colour: '#FDAE6B', def: 'Muscles and mind wound tight; a physical holding of anticipated stress.' },
  // insecure
  { key: 'inadequate', label: 'Inadequate', parent: 'insecure',  colour: '#FDAE6B', def: 'Feeling that you are not enough; falling short of what is required.' },
  { key: 'inferior',   label: 'Inferior',   parent: 'insecure',  colour: '#FDAE6B', def: 'Seeing yourself as less capable or worthy than others.' },

  // ── LOVE specific emotions ────────────────────────────────────────────────
  // caring
  { key: 'compassionate', label: 'Compassionate', parent: 'love-caring',   colour: '#F4A7B9', def: 'Moved by the suffering of others with a desire to help.' },
  { key: 'nurturing',     label: 'Nurturing',     parent: 'love-caring',   colour: '#F4A7B9', def: 'Taking care of someone\'s growth and wellbeing with warmth.' },
  // romantic
  { key: 'passionate',    label: 'Passionate',    parent: 'love-romantic', colour: '#F4A7B9', def: 'Intense, fervent feeling; love expressed with energy and depth.' },
  { key: 'infatuated',    label: 'Infatuated',    parent: 'love-romantic', colour: '#F4A7B9', def: 'Overwhelmingly absorbed in admiration or attraction to someone.' },
  // tender
  { key: 'warm',          label: 'Warm',          parent: 'love-tender',   colour: '#F4A7B9', def: 'A gentle, pleasant feeling of affection and closeness.' },
  { key: 'cherished',     label: 'Cherished',     parent: 'love-tender',   colour: '#F4A7B9', def: 'Feeling deeply valued and held with care by someone important to you.' },
  // grateful
  { key: 'appreciative',  label: 'Appreciative',  parent: 'love-grateful', colour: '#F4A7B9', def: 'Noticing and recognising the value of what someone has given or done.' },
  { key: 'blessed',       label: 'Blessed',       parent: 'love-grateful', colour: '#F4A7B9', def: 'Feeling fortunate, touched by goodness; as if life has given you more than you deserved.' },

  // ── GUILT specific emotions ───────────────────────────────────────────────
  // remorseful
  { key: 'guilty-sorry',    label: 'Sorry',      parent: 'guilt-remorseful',   colour: '#B5CFD8', def: 'A sincere acknowledgement of having caused pain or harm.' },
  { key: 'contrite',        label: 'Contrite',   parent: 'guilt-remorseful',   colour: '#B5CFD8', def: 'Genuinely penitent; feeling the weight of your wrongdoing.' },
  // regretful
  { key: 'wistful',         label: 'Wistful',    parent: 'guilt-regretful',    colour: '#B5CFD8', def: 'A gentle sadness mixed with longing for something that was or could have been.' },
  { key: 'rueful',          label: 'Rueful',     parent: 'guilt-regretful',    colour: '#B5CFD8', def: 'Feeling regretful and slightly bitter about something you cannot undo.' },
  // apologetic
  { key: 'repentant',       label: 'Repentant',  parent: 'guilt-apologetic',   colour: '#B5CFD8', def: 'Sincerely wanting to make amends and not repeat the wrongdoing.' },
  { key: 'accountable',     label: 'Accountable',parent: 'guilt-apologetic',   colour: '#B5CFD8', def: 'Taking full ownership of your actions and their consequences.' },
  // self-blaming
  { key: 'culpable',        label: 'Culpable',   parent: 'guilt-self-blaming', colour: '#B5CFD8', def: 'Believing yourself to be responsible and at fault for something.' },
  { key: 'guilty-bad',      label: 'Feeling Bad',parent: 'guilt-self-blaming', colour: '#B5CFD8', def: 'A general heaviness from knowing you hurt someone or acted against your values.' },

  // ── SHAME specific emotions ───────────────────────────────────────────────
  // humiliated
  { key: 'mortified',      label: 'Mortified',      parent: 'shame-humiliated', colour: '#C7B99A', def: 'Intensely embarrassed or shamed, often in front of others.' },
  { key: 'degraded',       label: 'Degraded',       parent: 'shame-humiliated', colour: '#C7B99A', def: 'Feeling your dignity or worth has been stripped away.' },
  // embarrassed
  { key: 'self-conscious', label: 'Self-Conscious', parent: 'shame-embarrassed', colour: '#C7B99A', def: 'Uncomfortably aware of yourself; worried how you appear to others.' },
  { key: 'awkward',        label: 'Awkward',        parent: 'shame-embarrassed', colour: '#C7B99A', def: 'Clumsy or uncomfortable in a social situation; unsure how to act.' },
  // exposed
  { key: 'transparent',    label: 'Transparent',    parent: 'shame-exposed', colour: '#C7B99A', def: 'Feeling as though your flaws or hidden self are fully visible to others.' },
  { key: 'vulnerable-sh',  label: 'Vulnerable',     parent: 'shame-exposed', colour: '#C7B99A', def: 'Exposed and at risk — your inner self is visible in a way that feels unsafe.' },
  // unworthy
  { key: 'defective',      label: 'Defective',      parent: 'shame-unworthy', colour: '#C7B99A', def: 'Believing something is fundamentally broken or wrong with who you are.' },
  { key: 'unlovable',      label: 'Unlovable',      parent: 'shame-unworthy', colour: '#C7B99A', def: 'Believing you are not capable of being loved or accepted as you truly are.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding emotions...')

  // 1. Core emotions
  for (const e of coreEmotions) {
    await upsertEmotion({
      key: e.key,
      label: e.label,
      definition: e.definition,
      ring: 'core',
      sectorColour: e.colour,
      levelMin: 'child',
      source: 'name-it-to-tame-it',
    })
  }
  console.log(`  ✓ ${coreEmotions.length} core emotions`)

  // 2. Mid-ring emotions
  for (const e of midEmotions) {
    await upsertEmotion({
      key: e.key,
      label: e.label,
      definition: e.def,
      parentKey: e.parent,
      ring: 'mid',
      sectorColour: e.colour,
      levelMin: 'adult',
      source: 'name-it-to-tame-it',
    })
  }
  console.log(`  ✓ ${midEmotions.length} mid-ring emotions`)

  // 3. Specific outer-ring emotions
  for (const e of specificEmotions) {
    await upsertEmotion({
      key: e.key,
      label: e.label,
      definition: e.def,
      parentKey: e.parent,
      ring: 'specific',
      sectorColour: e.colour,
      levelMin: 'advanced',
      source: 'name-it-to-tame-it',
    })
  }
  console.log(`  ✓ ${specificEmotions.length} specific emotions`)

  // ── Emotion Regulation dimensions (complete data from Handout 6) ──────────

  console.log('🌱 Seeding emotion regulation dimensions...')

  // ── ANGER ─────────────────────────────────────────────────────────────────
  await seedDimensions('angry', 'prompting_event', [
    'Having an important goal blocked.',
    'You or someone you care about being attacked or threatened by others.',
    'Losing power, status, or respect.',
    'Not having things turn out as expected.',
    'Physical or emotional pain.',
  ])
  await seedDimensions('angry', 'interpretation', [
    'Believing that you have been treated unfairly.',
    'Blaming.',
    'Believing that important goals are being blocked or stopped.',
    'Believing that things "should" be different than they are.',
    'Rigidly thinking, "I\'m right."',
    'Judging that the situation is illegitimate or wrong.',
    'Ruminating about the event that set off the anger in the first place.',
  ])
  await seedDimensions('angry', 'biological_change', [
    'Muscles tightening.',
    'Teeth clamping together.',
    'Hands clenching.',
    'Feeling your face flush or get hot.',
    'Feeling like you are going to explode.',
    'Being unable to stop tears.',
    'Wanting to hit someone, bang the wall, throw something, blow up.',
    'Wanting to hurt someone.',
  ])
  await seedDimensions('angry', 'expression_action', [
    'Physically or verbally attacking.',
    'Making aggressive or threatening gestures.',
    'Pounding, throwing things, breaking things.',
    'Walking heavily, stomping, slamming doors.',
    'Walking out.',
    'Using a loud, quarrelsome, or sarcastic voice.',
    'Using obscenities or swearing.',
    'Criticising or complaining.',
    'Clenching your hands or fists.',
    'Frowning, not smiling, mean expression.',
    'Brooding or withdrawing from others.',
    'Crying.',
    'A red or flushed face.',
  ])
  await seedDimensions('angry', 'aftereffect', [
    'Narrowing of attention.',
    'Attending only to the situation that is making you angry.',
    'Ruminating about the situation making you angry or about situations in the past.',
    'Imagining future situations that will make you angry.',
    'Depersonalisation, dissociative experiences, numbness.',
  ])
  await seedDimensions('angry', 'opposite_action', [
    'Gently avoid the person you are angry with rather than attacking.',
    'Take a time out and breathe slowly and deeply.',
    'Be kind rather than mean or insulting.',
    'Step into the other person\'s shoes — imagine understanding and empathy.',
    'Unclench hands with palms up (willing hands). Relax facial muscles. Half-smile.',
    'Do paced breathing: breathe in deeply, breathe out slowly.',
  ], 'adult', 'emotion-regulation-handout-11')

  // ── DISGUST ───────────────────────────────────────────────────────────────
  await seedDimensions('disgusted', 'prompting_event', [
    'Seeing/smelling human or animal waste products.',
    'Having a person or an animal that is dirty, slimy, or unclean come close to you.',
    'Tasting something or being forced to swallow something you really don\'t want.',
    'Seeing or being near a dead body.',
    'Observing or hearing about a person who grovels or strips another person of dignity.',
    'Observing or hearing about betrayal, child abuse, racism, or other cruelty.',
    'Being forced to watch something that deeply violates your own values.',
    'Being confronted with someone who is deeply violating your own values.',
  ])
  await seedDimensions('disgusted', 'interpretation', [
    'Believing that you are swallowing something toxic.',
    'Believing your skin or your mind is being contaminated.',
    'Believing your own body or body parts are ugly.',
    'Believing others are evil or the "scum" of the earth.',
    'Disapproving of or feeling morally superior to another.',
    'Extreme disapproval of yourself or your own feelings, thoughts, or behaviours.',
    'Judging that a person is deeply immoral or has sinned.',
    'Judging someone\'s body as extremely ugly.',
  ])
  await seedDimensions('disgusted', 'biological_change', [
    'Feelings of nausea; sick feeling.',
    'Urge to vomit, gag, choke.',
    'Having a lump in your throat.',
    'Aversion to drinking or eating.',
    'Intense urge to destroy or get rid of something.',
    'Urge to take a shower.',
    'Urge to run away or push away.',
    'Feeling contaminated, dirty, unclean.',
    'Feeling mentally polluted.',
  ])
  await seedDimensions('disgusted', 'expression_action', [
    'Vomiting, spitting out.',
    'Closing your eyes, looking away.',
    'Washing, scrubbing, taking a bath.',
    'Changing your clothes; cleaning spaces.',
    'Avoiding eating or drinking.',
    'Pushing or kicking away; running away.',
    'Treating with disdain or disrespect.',
    'Physically attacking causes of your disgust.',
    'Using obscenities or cursing.',
    'Frowning, or not smiling.',
    'Nose and top lip tightened up; smirking.',
  ])
  await seedDimensions('disgusted', 'aftereffect', [
    'Narrowing of attention.',
    'Ruminating about the situation that is making you feel disgusted.',
    'Becoming hypersensitive to dirt.',
  ])
  await seedDimensions('disgusted', 'opposite_action', [
    'Move close. Embrace.',
    'Be kind; step into the other person\'s shoes.',
    'Take in what feels repulsive rather than turning away.',
    'See the situation from the other person\'s point of view.',
  ], 'adult', 'emotion-regulation-handout-11')

  // ── ENVY ──────────────────────────────────────────────────────────────────
  await seedDimensions('envy', 'prompting_event', [
    'Someone has something you really want or need but don\'t or can\'t have.',
    'You are not part of the "in" crowd.',
    'Someone appears to have everything.',
    'You are alone while others are having fun.',
    'Someone else gets credit for what you\'ve done.',
    'Someone gets positive recognition for something and you don\'t.',
    'Others get something you really want and you don\'t get it.',
    'Being around people who have more than you have.',
    'Someone you are competing with is more successful than you in an area important to you.',
  ])
  await seedDimensions('envy', 'interpretation', [
    'Thinking you deserve what others have.',
    'Thinking others have more than you.',
    'Thinking about how unfair it is that you have such a bad lot in life compared to others.',
    'Thinking you have been treated unfairly by life.',
    'Thinking you are unlucky.',
    'Thinking you are inferior, a failure, or mediocre in comparison to others you want to be like.',
    'Comparing yourself to others who have more than you.',
    'Comparing yourself to people who have characteristics that you wish you had.',
    'Thinking you are unappreciated.',
  ])
  await seedDimensions('envy', 'biological_change', [
    'Muscles tightening.',
    'Teeth clamping together, mouth tightening.',
    'Feeling your face flush or get hot.',
    'Feeling rigidity in your body.',
    'Pain in the pit of the stomach.',
    'Having an urge to get even.',
    'Hating the other person.',
    'Wanting to hurt the people you envy.',
    'Wanting the person you envy to lose what they have, to have bad luck, or to be hurt.',
    'Feeling pleasure when others experience failure or lose what they have.',
    'Feeling unhappy if another person experiences some good luck.',
    'Feeling motivated to improve yourself.',
  ])
  await seedDimensions('envy', 'expression_action', [
    'Doing everything you can to get what the other person has.',
    'Working a lot harder than you were to get what you want.',
    'Trying to improve yourself and your situation.',
    'Taking away or ruining what the other person has.',
    'Attacking or criticising the other person.',
    'Doing something to get even.',
    'Doing something to make the other person fail or lose what they have.',
    'Saying mean things about the other person or making them look bad to others.',
    'Trying to show the other person up, to look better than them.',
    'Avoiding persons who have what you want.',
  ])
  await seedDimensions('envy', 'aftereffect', [
    'Narrowing of attention.',
    'Attending only to what others have that you don\'t.',
    'Ruminating when others have had more than you.',
    'Discounting what you do have; not appreciating things you have or what others do for you.',
    'Ruminating about what you don\'t have.',
    'Making resolutions to change.',
  ])

  // ── FEAR ──────────────────────────────────────────────────────────────────
  await seedDimensions('fearful', 'prompting_event', [
    'Having your life, health, or wellbeing threatened.',
    'Being in the same situation where you have been threatened or hurt in the past.',
    'Flashbacks.',
    'Being in situations where you have seen others threatened or hurt.',
    'Silence.',
    'Being in a new or unfamiliar situation.',
    'Being alone (e.g. walking alone, being home alone, living alone).',
    'Being in the dark.',
    'Being in crowds.',
    'Leaving your home.',
    'Having to perform in front of others.',
    'Pursuing your dreams.',
  ])
  await seedDimensions('fearful', 'interpretation', [
    'Believing that you might die, or are going to die.',
    'Believing you might be hurt or harmed.',
    'Believing you might lose something valuable.',
    'Believing someone might reject, criticise, or dislike you.',
    'Believing you will embarrass yourself.',
    'Failure is possible; expecting to fail.',
    'Believing that you will not get help you want or need.',
    'Believing you might lose someone important.',
    'Believing you are helpless or losing a sense of control.',
    'Believing you are incompetent or losing mastery.',
  ])
  await seedDimensions('fearful', 'biological_change', [
    'Breathlessness.',
    'Fast heartbeat.',
    'Choking sensation, lump in throat.',
    'Muscles tensing, cramping.',
    'Clenching teeth.',
    'Urge to scream or call out.',
    'Feeling nauseated.',
    'Getting cold; feeling clammy.',
    'Feeling your hairs standing on end.',
    'Feeling of "butterflies" in stomach.',
    'Wanting to run away or avoid things.',
  ])
  await seedDimensions('fearful', 'expression_action', [
    'Fleeing, running away.',
    'Running or walking hurriedly.',
    'Hiding from or avoiding what you fear.',
    'Engaging in nervous, fearful talk.',
    'Pleading or crying for help.',
    'Talking less or becoming speechless.',
    'Screaming or yelling.',
    'Darting eyes or quickly looking around.',
    'Frozen stare.',
    'Talking yourself out of doing what you fear.',
    'Freezing, or trying not to move.',
    'Crying or whimpering.',
    'Shaking, quivering, or trembling.',
    'A shaky or trembling voice.',
    'Sweating or perspiring.',
  ])
  await seedDimensions('fearful', 'aftereffect', [
    'Narrowing of attention.',
    'Being hypervigilant to threat.',
    'Losing your ability to focus or becoming disoriented or dazed.',
    'Losing control.',
    'Imagining the possibility of more loss or failure.',
    'Isolating yourself.',
    'Ruminating about other threatening times.',
  ])
  await seedDimensions('fearful', 'opposite_action', [
    'Do what you are afraid of doing — over and over.',
    'Approach events, places, tasks, and people you are afraid of.',
    'Keep your eyes and ears open and focused on the feared event.',
    'Take in the information from the situation — notice that you are safe.',
    'Keep a confident posture: head and eyes up, shoulders back but relaxed.',
    'Do paced breathing: breathe in deeply and breathe out slowly.',
  ], 'adult', 'emotion-regulation-handout-11')

  // ── HAPPINESS ─────────────────────────────────────────────────────────────
  await seedDimensions('happy', 'prompting_event', [
    'Receiving a wonderful surprise.',
    'Reality exceeding your expectations.',
    'Getting what you want.',
    'Getting something you have worked hard for or worried about.',
    'Things turning out better than you thought they would.',
    'Being successful at a task.',
    'Achieving a desirable outcome.',
    'Receiving esteem, respect, or praise.',
    'Receiving love, liking, or affection.',
    'Being accepted by others.',
    'Belonging somewhere or with someone or a group.',
    'Being with or in contact with people who love or like you.',
    'Having very pleasurable sensations.',
  ])
  await seedDimensions('happy', 'interpretation', [
    'Interpreting joyful events just as they are, without adding or subtracting.',
  ])
  await seedDimensions('happy', 'biological_change', [
    'Feeling excited.',
    'Feeling physically energetic, active.',
    'Feeling like giggling or laughing.',
    'Feeling your face flush.',
    'Feeling calm all the way through.',
    'Urge to keep doing what is associated with happiness.',
    'Feeling at peace.',
    'Feeling open or expansive.',
  ])
  await seedDimensions('happy', 'expression_action', [
    'Smiling.',
    'Having a bright, glowing face.',
    'Being bouncy or bubbly.',
    'Communicating your good feelings.',
    'Sharing the feeling.',
    'Hugging people.',
    'Jumping up and down.',
    'Saying positive things.',
    'Using an enthusiastic or excited voice.',
    'Being talkative or talking a lot.',
  ])
  await seedDimensions('happy', 'aftereffect', [
    'Being courteous or friendly to others.',
    'Doing nice things for other people.',
    'Having a positive outlook; seeing the bright side.',
    'Having a high threshold for worry or annoyance.',
    'Remembering and imagining other times you have felt joyful.',
    'Expecting to feel joyful in the future.',
  ])

  // ── JEALOUSY ──────────────────────────────────────────────────────────────
  await seedDimensions('jealousy', 'prompting_event', [
    'An important relationship is threatened or in danger of being lost.',
    'A potential competitor pays attention to someone you love.',
    'Someone is threatening to take away important things in your life.',
    'Someone goes out with the person you like.',
    'Someone ignores you while talking to a friend of yours.',
    'Someone is more attractive, outgoing, or self-confident than you.',
    'You are treated as unimportant by a person you want to be close to.',
    'Your partner tells you that they desire more time alone.',
    'Your partner appears to flirt with someone else.',
    'You find the person you love is having an affair with someone else.',
  ])
  await seedDimensions('jealousy', 'interpretation', [
    'Believing your partner does not care for you any more.',
    'Believing you are nothing to your partner.',
    'Believing your partner is going to leave you.',
    'Believing your partner is behaving inappropriately.',
    'Believing you don\'t measure up to your peers.',
    'Believing you deserve more than what you are receiving.',
    'Believing you were cheated.',
    'Believing no one cares about you.',
  ])
  await seedDimensions('jealousy', 'biological_change', [
    'Breathlessness.',
    'Fast heartbeat.',
    'Choking sensation, lump in throat.',
    'Muscles tensing.',
    'Teeth clenching.',
    'Becoming suspicious of others.',
    'Having injured pride.',
    'Feelings of rejection.',
    'Needing to be in control.',
    'Feeling helpless.',
    'Wanting to grasp or keep hold of what you have.',
    'Wanting to push away or eliminate your rival.',
  ])
  await seedDimensions('jealousy', 'expression_action', [
    'Violent behaviour or threats of violence toward the person threatening to take something away.',
    'Attempting to control the freedom of the person you are afraid of losing.',
    'Verbal accusations of disloyalty or unfaithfulness.',
    'Spying on the person.',
    'Interrogating the person; demanding accounting of time or activities.',
    'Collecting evidence of wrongdoings.',
    'Clinging; enhanced dependency.',
    'Increased or excessive demonstrations of love.',
  ])
  await seedDimensions('jealousy', 'aftereffect', [
    'Narrowing of attention.',
    'Seeing the worst in others.',
    'Being mistrustful across the board.',
    'Being hypervigilant to threats to your relationships.',
    'Becoming isolated or withdrawn.',
  ])

  // ── LOVE ──────────────────────────────────────────────────────────────────
  await seedDimensions('love', 'prompting_event', [
    'A person offers or gives you something you want, need, or desire.',
    'A person does things you want or need.',
    'A person does things you particularly value or admire.',
    'Feeling physically attracted to someone.',
    'Being with someone you have fun with.',
    'You spend a lot of time with a person.',
    'You share a special experience with a person.',
    'You have exceptionally good communication with a person.',
  ])
  await seedDimensions('love', 'interpretation', [
    'Believing that a person loves, needs, or appreciates you.',
    'Thinking that a person is physically attractive.',
    'Judging a person\'s personality as wonderful, pleasing, or attractive.',
    'Believing that a person can be counted on, or will always be there for you.',
  ])
  await seedDimensions('love', 'biological_change', [
    'Feeling excited and full of energy.',
    'Fast heartbeat.',
    'Feeling self-confident.',
    'Feeling invulnerable.',
    'Feeling happy, joyful, or exuberant.',
    'Feeling warm, trusting, and secure.',
    'Feeling relaxed and calm.',
    'Wanting the best for a person.',
    'Wanting to give things to a person.',
    'Wanting to see and spend time with a person.',
    'Wanting physical closeness.',
    'Wanting emotional closeness.',
  ])
  await seedDimensions('love', 'expression_action', [
    'Saying "I love you."',
    'Expressing positive feelings to a person.',
    'Eye contact, mutual gaze.',
    'Touching, petting, hugging, holding, cuddling.',
    'Smiling.',
    'Sharing time and experiences with someone.',
    'Doing things that the other person wants or needs.',
  ])
  await seedDimensions('love', 'aftereffect', [
    'Only seeing a person\'s positive side.',
    'Feeling forgetful or distracted; daydreaming.',
    'Feeling openness and trust.',
    'Feeling "alive," capable.',
    'Remembering other people you have loved.',
    'Remembering other people who have loved you.',
    'Believing in yourself; believing you are wonderful, capable, competent.',
  ])

  // ── SADNESS ───────────────────────────────────────────────────────────────
  await seedDimensions('sad', 'prompting_event', [
    'Losing something or someone irretrievably.',
    'The death of someone you love.',
    'Things not being what you expected or wanted.',
    'Things being worse than you expected.',
    'Being separated from someone you care for.',
    'Getting what you don\'t want.',
    'Not getting what you have worked for.',
    'Not getting what you believe you need in life.',
    'Being rejected, disapproved of, or excluded.',
    'Discovering that you are powerless or helpless.',
    'Being with someone else who is sad or in pain.',
    'Reading or hearing about other people\'s problems or troubles.',
    'Being alone, or feeling isolated or like an outsider.',
    'Thinking about your losses.',
    'Thinking about missing someone.',
  ])
  await seedDimensions('sad', 'interpretation', [
    'Believing that a separation from someone will last for a long time or will never end.',
    'Believing that you will not get what you want or need in your life.',
    'Seeing things or your life as hopeless.',
    'Believing that you are worthless or not valuable.',
  ])
  await seedDimensions('sad', 'biological_change', [
    'Feeling tired, run down, or low in energy.',
    'Feeling lethargic, listless; wanting to stay in bed all day.',
    'Feeling as if nothing is pleasurable any more.',
    'Pain or hollowness in your chest or gut.',
    'Feeling empty.',
    'Feeling as if you can\'t stop crying.',
    'Difficulty swallowing.',
    'Breathlessness.',
    'Dizziness.',
  ])
  await seedDimensions('sad', 'expression_action', [
    'Avoiding things.',
    'Acting helpless; staying in bed; being inactive.',
    'Moping, brooding, or acting moody.',
    'Making slow, shuffling movements.',
    'Withdrawing from social contact.',
    'Avoiding activities that used to bring pleasure.',
    'Giving up and no longer trying to improve.',
    'Saying sad things.',
    'Talking little or not at all.',
    'Using a quiet, slow, or monotonous voice.',
    'Eyes drooping.',
    'Frowning, not smiling.',
    'Posture slumping.',
    'Sobbing, crying, whimpering.',
  ])
  await seedDimensions('sad', 'aftereffect', [
    'Not being able to remember happy things.',
    'Feeling irritable, touchy, or grouchy.',
    'Yearning and searching for the thing lost.',
    'Having a negative outlook.',
    'Blaming or criticising yourself.',
    'Ruminating about sad events in the past.',
    'Insomnia.',
    'Appetite disturbance, indigestion.',
  ])
  await seedDimensions('sad', 'opposite_action', [
    'Activate your behaviour — avoid avoiding.',
    'Get up and do something, even something small.',
    'Build mastery: do one thing that gives you a sense of accomplishment.',
    'Reach out to someone rather than withdrawing.',
    'Do something from your pleasant events list.',
  ], 'adult', 'emotion-regulation-handout-11')

  // ── SHAME ─────────────────────────────────────────────────────────────────
  await seedDimensions('shame', 'prompting_event', [
    'Being rejected by people you care about.',
    'Having others find out that you have done something wrong.',
    'Doing (or feeling or thinking) something that people you admire believe is wrong or immoral.',
    'Comparing some aspect of yourself or your behaviour to a standard and feeling you do not live up to it.',
    'Being betrayed by a person you love.',
    'Being laughed at or made fun of.',
    'Being criticised in public or in front of someone else.',
    'Others attacking your integrity.',
    'Being reminded of something wrong, immoral, or shameful you did in the past.',
    'Being rejected or criticised for something you expected praise for.',
    'Having emotions or experiences that have been invalidated.',
    'Exposure of a very private aspect of yourself or your life.',
    'Exposure of a physical characteristic you dislike.',
    'Failing at something you feel you are (or should be) competent to do.',
  ])
  await seedDimensions('shame', 'interpretation', [
    'Believing that others will reject you (or have rejected you).',
    'Judging yourself to be inferior, not "good enough," not as good as others.',
    'Comparing yourself to others and thinking that you are a "loser".',
    'Believing yourself unlovable.',
    'Thinking that you are bad, immoral, or wrong.',
    'Thinking that you are defective.',
    'Thinking that you are a bad person or a failure.',
    'Believing your body (or a body part) is too big, too small, or ugly.',
    'Thinking that you have not lived up to others\' expectations of you.',
    'Thinking that your behaviour, thoughts, or feelings are silly or stupid.',
  ])
  await seedDimensions('shame', 'biological_change', [
    'Pain in the pit of the stomach.',
    'Sense of dread.',
    'Wanting to shrink down and/or disappear.',
    'Wanting to hide or cover your face and body.',
  ])
  await seedDimensions('shame', 'expression_action', [
    'Hiding behaviour or a characteristic from other people.',
    'Avoiding the person you have harmed.',
    'Avoiding persons who have criticised you.',
    'Avoiding yourself — distracting, ignoring.',
    'Withdrawing; covering the face.',
    'Bowing your head, grovelling.',
    'Appeasing; saying you are sorry over and over.',
    'Looking down and away from others.',
    'Sinking back; slumped and rigid posture.',
    'Halting speech; lowered volume while talking.',
  ])
  await seedDimensions('shame', 'aftereffect', [
    'Avoiding thinking about your transgression; shutting down; blocking all emotions.',
    'Engaging in distracting, impulsive behaviours to divert your mind or attention.',
    'High amount of self-focus; preoccupation with yourself.',
    'Depersonalisation, dissociative experiences, numbness, or shock.',
    'Attacking or blaming others.',
    'Conflicts with other people.',
    'Isolation, feeling alienated.',
    'Impairment in problem-solving ability.',
  ])
  await seedDimensions('shame', 'opposite_action', [
    'Make public your personal characteristics or behaviour — with people who won\'t reject you.',
    'Repeat the behaviour without hiding from safe people.',
    'If your moral code was violated: apologise, repair, forgive yourself, and let it go.',
  ], 'adult', 'emotion-regulation-handout-11')

  // ── GUILT ─────────────────────────────────────────────────────────────────
  await seedDimensions('guilt', 'prompting_event', [
    'Doing or thinking something you believe is wrong.',
    'Doing or thinking something that violates your personal values.',
    'Not doing something you said you would do.',
    'Committing a transgression against another person or something you value.',
    'Causing harm or damage to another person or object.',
    'Causing harm or damage to yourself.',
    'Being reminded of something wrong you did in the past.',
  ])
  await seedDimensions('guilt', 'interpretation', [
    'Thinking that your actions are to blame for something.',
    'Thinking that you behaved badly.',
    'Thinking, "If only I had done something differently..."',
  ])
  await seedDimensions('guilt', 'biological_change', [
    'Hot, red face.',
    'Jitteriness or nervousness.',
    'Suffocating.',
  ])
  await seedDimensions('guilt', 'expression_action', [
    'Trying to repair the harm, make amends for the wrongdoing, fix the damage, or change the outcome.',
    'Asking for forgiveness, apologising, confessing.',
    'Giving gifts or making sacrifices to try to make up for the transgression.',
    'Bowing your head; kneeling before the person.',
  ])
  await seedDimensions('guilt', 'aftereffect', [
    'Making resolutions to change.',
    'Making changes in behaviour.',
    'Joining self-help programmes.',
  ])
  await seedDimensions('guilt', 'opposite_action', [
    'If guilt is unjustified: do what makes you feel guilty over and over.',
    'If justified: seek forgiveness. Repair the harm.',
    'Accept the consequences gracefully.',
    'Commit to avoiding the behaviour that violates your moral values in future.',
  ], 'adult', 'emotion-regulation-handout-11')

  // What emotions do for you — shown in definition panel
  for (const key of ['happy', 'sad', 'angry', 'disgusted', 'fearful', 'shame', 'guilt', 'love', 'bad', 'surprised', 'envy', 'jealousy']) {
    await seedDimensions(key, 'what_it_does', [
      'Emotions motivate us for action — they prepare us and help us overcome obstacles.',
      'Emotions communicate to others — our face and body language signal how we feel faster than words.',
      'Emotions communicate to ourselves — gut feelings are signals that something important is happening.',
    ], 'child', 'dbt-handout-3')
  }

  console.log('  ✓ Emotion regulation dimensions seeded')

  // ── Coping suggestions ────────────────────────────────────────────────────

  console.log('🌱 Seeding coping suggestions...')

  // Universal breathing (child level)
  await seedCoping(null, [
    { suggestion: 'Take 3 slow, deep breaths. Breathe in for 4 counts, out for 6.', category: 'breathing', levelMin: 'child' },
    { suggestion: 'Try box breathing: breathe in for 4, hold for 4, out for 4, hold for 4.', category: 'breathing', levelMin: 'adult' },
    { suggestion: 'Try paced breathing: breathe in deeply and breathe out slowly. Do this for 2 minutes.', category: 'breathing', levelMin: 'adult' },
  ], 'dbt-handout-20')

  // PLEASE skills (adult+)
  await seedCoping(null, [
    { suggestion: 'Take care of any physical illness — see a doctor if needed and take prescribed medication.', category: 'please_skill', levelMin: 'adult' },
    { suggestion: 'Balance your eating — don\'t eat too much or too little. Eat regularly and mindfully.', category: 'please_skill', levelMin: 'adult' },
    { suggestion: 'Avoid mood-altering substances — stay off illicit drugs and use alcohol in moderation.', category: 'please_skill', levelMin: 'adult' },
    { suggestion: 'Balance your sleep — aim for 7–9 hours. Keep a consistent sleep schedule.', category: 'please_skill', levelMin: 'adult' },
    { suggestion: 'Get some exercise today — even a short walk makes a difference.', category: 'please_skill', levelMin: 'child' },
  ], 'dbt-handout-20')

  // Grounding (child level)
  await seedCoping(null, [
    { suggestion: '5-4-3-2-1: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.', category: 'grounding', levelMin: 'child' },
    { suggestion: 'Put your feet flat on the floor. Feel the ground holding you up.', category: 'grounding', levelMin: 'child' },
    { suggestion: 'Splash cold water on your face or hold ice in your hands to bring yourself back to the present.', category: 'grounding', levelMin: 'adult' },
  ], 'dbt-handout-22')

  // Mindfulness
  await seedCoping(null, [
    { suggestion: 'Notice this feeling like a wave — it will rise and fall. You don\'t have to act on it.', category: 'mindfulness', levelMin: 'adult' },
    { suggestion: 'You are not your emotion. You are the person experiencing it. Remember a time you felt differently.', category: 'mindfulness', levelMin: 'adult' },
    { suggestion: 'Observe where in your body you feel this emotion. Just notice, without judgment.', category: 'mindfulness', levelMin: 'adult' },
  ], 'dbt-handout-22')

  // Crisis resources (Irish — from Basic wheel PDF)
  await seedCoping(null, [
    { suggestion: 'Samaritans — Call 116 123 (free, 24/7). You don\'t have to be suicidal to call.', category: 'crisis', levelMin: 'child' },
    { suggestion: 'Pieta — Call 1800 247 247 or text HELP to 51444. Free crisis support.', category: 'crisis', levelMin: 'child' },
    { suggestion: 'Childline — Call 1800 66 66 66 or chat at childline.ie (under 18s).', category: 'crisis', levelMin: 'child' },
    { suggestion: 'Text 50808 — Text HELLO to 50808 for free, confidential text support, any time.', category: 'crisis', levelMin: 'child' },
    { suggestion: 'If you or someone else is in danger right now, call 999 or 112.', category: 'crisis', levelMin: 'child' },
  ], 'basic-wheel-pdf')

  console.log('  ✓ Coping suggestions seeded')

  // ── Emotion myths (Handout 4a) ────────────────────────────────────────────

  console.log('🌱 Seeding emotion myths...')

  await prisma.emotionMyth.deleteMany()
  await prisma.emotionMyth.createMany({
    data: [
      { mythText: 'There is a right way to feel in every situation.', displayOrder: 1 },
      { mythText: 'Letting others know that I am feeling bad is a weakness.', displayOrder: 2 },
      { mythText: 'Negative feelings are bad and destructive.', displayOrder: 3 },
      { mythText: 'Being emotional means being out of control.', displayOrder: 4 },
      { mythText: 'Some emotions are stupid.', displayOrder: 5 },
      { mythText: 'All painful emotions are a result of a bad attitude.', displayOrder: 6 },
      { mythText: 'If others don\'t approve of my feelings, I obviously shouldn\'t feel the way I do.', displayOrder: 7 },
      { mythText: 'Other people are the best judges of how I am feeling.', displayOrder: 8 },
      { mythText: 'Painful emotions are not important and should be ignored.', displayOrder: 9 },
      { mythText: 'Extreme emotions get you a lot further than trying to regulate your emotions.', displayOrder: 10 },
      { mythText: 'Creativity requires intense, often out-of-control emotions.', displayOrder: 11 },
      { mythText: 'Drama is cool.', displayOrder: 12 },
      { mythText: 'It is inauthentic to try to change my emotions.', displayOrder: 13 },
      { mythText: 'Emotional truth is what counts, not factual truth.', displayOrder: 14 },
      { mythText: 'People should do whatever they feel like doing.', displayOrder: 15 },
      { mythText: 'Acting on your emotions is the mark of a truly free individual.', displayOrder: 16 },
      { mythText: 'My emotions are who I am.', displayOrder: 17 },
      { mythText: 'My emotions are why people love me.', displayOrder: 18 },
      { mythText: 'Emotions can just happen for no reason.', displayOrder: 19 },
      { mythText: 'Emotions should always be trusted.', displayOrder: 20 },
    ],
  })

  console.log('  ✓ Emotion myths seeded')
  console.log('\n✅ Seed complete.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
