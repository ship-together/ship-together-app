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
      className="group flex flex-col bg-[#171714] border border-[#292923] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F59E0B]/50"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[#090909] border-b border-[#292923]">
        <SafeImage
          src={project.coverImageUrl}
          alt={`${project.name} cover`}
          fallbackLabel={project.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#A3A3A3]">
            <span
              className={
                project.status === 'Launched'
                  ? 'text-[#F59E0B] font-medium'
                  : project.status === 'Completed'
                    ? 'text-emerald-400 font-medium'
                    : 'text-white/80 font-medium'
              }
            >
              {project.status}
            </span>
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-2">
                <span aria-hidden="true">·</span>
                <span>{tag}</span>
              </span>
            ))}
          </div>

          <h3 className="mt-2 font-display text-lg font-semibold text-white group-hover:text-[#F59E0B] transition-colors flex items-center justify-between gap-2">
            <span className="truncate">{project.name}</span>
            <ArrowUpRight className="w-4 h-4 shrink-0 text-[#A3A3A3] group-hover:text-[#F59E0B] transition-colors" />
          </h3>

          <p className="mt-2 text-sm text-[#A3A3A3] leading-relaxed line-clamp-2">
            {project.description}
          </p>
        </div>

        <div className="pt-3 border-t border-[#292923]/70 flex items-center gap-2.5">
          <SafeImage
            src={project.ownerAvatarUrl}
            alt={project.ownerDisplayName}
            fallbackLabel={project.ownerDisplayName}
            variant="avatar"
            className="w-6 h-6 rounded-full object-cover border border-[#292923]"
          />
          <span className="text-xs text-[#A3A3A3] truncate">
            {project.ownerDisplayName}{' '}
            <span className="font-mono text-[#A3A3A3]/70">@{project.ownerUsername}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
