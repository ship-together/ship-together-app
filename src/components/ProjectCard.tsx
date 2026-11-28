import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Project } from '../types/domain';
import { SafeImage } from './SafeImage';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex flex-col bg-[#111114] border border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25"
    >
      <div className="aspect-video w-full overflow-hidden bg-[#141418] border-b border-white/10">
        <SafeImage
          src={project.coverImageUrl}
          alt={`${project.name} cover`}
          fallbackLabel={project.name}
          className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#A1A1AA]">
            {project.status === 'Launched' ? (
              <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                {project.status}
              </span>
            ) : (
              <span
                className={
                  project.status === 'Completed'
                    ? 'text-[#A1A1AA] font-medium'
                    : 'text-[#FAFAFA] font-medium'
                }
              >
                {project.status}
              </span>
            )}
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-2">
                <span aria-hidden="true">·</span>
                <span>{tag}</span>
              </span>
            ))}
          </div>

          <h3 className="mt-2 font-display text-lg font-semibold text-[#FAFAFA] group-hover:text-white transition-colors flex items-center justify-between gap-2">
            <span className="truncate">{project.name}</span>
            <ArrowUpRight className="w-4 h-4 shrink-0 text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors" />
          </h3>

          <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed line-clamp-2">
            {project.description}
          </p>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center gap-2.5">
          <SafeImage
            src={project.ownerAvatarUrl}
            alt={project.ownerDisplayName}
            fallbackLabel={project.ownerDisplayName}
            variant="avatar"
            className="w-6 h-6 rounded-full object-cover border border-white/10"
          />
          <span className="text-xs text-[#A1A1AA] truncate">
            {project.ownerDisplayName}{' '}
            <span className="font-mono text-[#A1A1AA]/70">@{project.ownerUsername}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
